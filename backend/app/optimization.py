from ax.service.ax_client import AxClient
import logging
import traceback

# Configure logger
logger = logging.getLogger(__name__)

class ExperimentManager:
    def __init__(self):
        """Initialize the experiment manager."""
        self.experiments = {}
    
    def create_experiment(self, experiment_id, config):
        """Create a basic experiment that should work with any Ax version."""
        try:
            # Initialize a new Ax client
            ax_client = AxClient()
            logger.info(f"Creating experiment: {config.name}")
            
            # Prepare parameters
            parameters = []
            for param in config.parameters:
                param_dict = {"name": param.name, "type": param.type}
                
                if param.type == "range":
                    param_dict["bounds"] = param.bounds
                elif param.type == "choice":
                    param_dict["values"] = param.values
                elif param.type == "fixed":
                    param_dict["value"] = param.value
                
                parameters.append(param_dict)
            
            # Extract objectives information for our own tracking
            if hasattr(config, 'objectives') and len(config.objectives) > 0:
                multi_objective = len(config.objectives) > 1
                objectives = []
                for obj in config.objectives:
                    objectives.append({
                        "name": obj.name,
                        "minimize": obj.minimize
                    })
                primary_objective = objectives[0]
            else:
                multi_objective = False
                objectives = [{
                    "name": getattr(config, 'objective_name', 'objective'),
                    "minimize": getattr(config, 'minimize', False)
                }]
                primary_objective = objectives[0]
            
            # Create experiment with just name and parameters
            # This most basic approach should work with any Ax version
            ax_client.create_experiment(
                name=config.name,
                parameters=parameters
            )
            
            # Store experiment details with our own objective tracking
            self.experiments[experiment_id] = {
                "config": config,
                "ax_client": ax_client,
                "trials": {},
                "multi_objective": multi_objective,
                "objectives": objectives,
                "primary_objective": primary_objective
            }
            
            logger.info(f"Successfully created experiment {experiment_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating experiment: {e}")
            logger.error(traceback.format_exc())
            return False
    
    def get_next_trial(self, experiment_id):
        """Generate parameters for the next trial."""
        if experiment_id not in self.experiments:
            logger.error(f"Experiment {experiment_id} not found")
            return None, None
        
        try:
            ax_client = self.experiments[experiment_id]["ax_client"]
            
            # Get next trial parameters
            logger.info(f"Getting next trial for experiment {experiment_id}")
            parameters, trial_index = ax_client.get_next_trial()
            logger.info(f"Got trial {trial_index} with parameters: {parameters}")
            
            # Store the trial
            self.experiments[experiment_id]["trials"][trial_index] = {
                "parameters": parameters,
                "status": "pending"
            }
            
            return parameters, trial_index
        except Exception as e:
            logger.error(f"Error getting next trial: {e}")
            logger.error(traceback.format_exc())
            return None, None
    
    def complete_trial(self, experiment_id, trial_id, objective_values):
        """Complete a trial with observed results."""
        if experiment_id not in self.experiments:
            logger.error(f"Experiment {experiment_id} not found")
            return False
        
        experiment = self.experiments[experiment_id]
        
        if trial_id not in experiment["trials"]:
            logger.error(f"Trial {trial_id} not found in experiment {experiment_id}")
            return False
        
        try:
            # Get the Ax client
            ax_client = experiment["ax_client"]
            
            # Store objective values for our analysis
            experiment["trials"][trial_id]["objective_values"] = objective_values
            
            # Extract primary objective value for Ax
            # (Ax doesn't know about our objectives but needs a value to optimize)
            primary_objective_name = experiment["primary_objective"]["name"]
            primary_value = 0.0
            
            if isinstance(objective_values, dict) and primary_objective_name in objective_values:
                primary_value = objective_values[primary_objective_name]
                
                # If minimizing, negate the value for Ax
                # (Ax assumes maximization by default)
                if experiment["primary_objective"]["minimize"]:
                    primary_value = -primary_value
            elif not isinstance(objective_values, dict):
                # If a direct value is provided, use it
                primary_value = objective_values
            
            # Complete the trial with the primary value for Ax to optimize
            logger.info(f"Completing trial {trial_id} with value: {primary_value}")
            ax_client.complete_trial(trial_index=trial_id, raw_data=primary_value)
            
            # Update trial status
            experiment["trials"][trial_id]["status"] = "completed"
            experiment["trials"][trial_id]["result"] = objective_values
            
            return True
        except Exception as e:
            logger.error(f"Error completing trial: {e}")
            logger.error(traceback.format_exc())
            return False
    
    def get_pareto_front(self, experiment_id):
        """Calculate the Pareto front for multi-objective experiments."""
        if experiment_id not in self.experiments:
            logger.error(f"Experiment {experiment_id} not found")
            return None
        
        experiment = self.experiments[experiment_id]
        
        # Check if multi-objective
        if not experiment["multi_objective"]:
            return {"error": "Pareto front only available for multi-objective experiments"}
        
        try:
            # Get completed trials
            trials_data = []
            
            for trial_id, trial_info in experiment["trials"].items():
                if trial_info.get("status") == "completed" and "objective_values" in trial_info:
                    trials_data.append({
                        "trial_id": trial_id,
                        "parameters": trial_info["parameters"],
                        "objective_values": trial_info["objective_values"]
                    })
            
            if not trials_data:
                logger.info(f"No completed trials for experiment {experiment_id}")
                return []
            
            # Calculate Pareto front
            logger.info(f"Calculating Pareto front from {len(trials_data)} trials")
            pareto_front = []
            
            for trial1 in trials_data:
                is_dominated = False
                
                for trial2 in trials_data:
                    if trial1["trial_id"] == trial2["trial_id"]:
                        continue
                    
                    # Check if trial2 dominates trial1
                    dominates = True
                    at_least_one_better = False
                    
                    for obj in experiment["objectives"]:
                        obj_name = obj["name"]
                        
                        if obj_name not in trial1["objective_values"] or obj_name not in trial2["objective_values"]:
                            dominates = False
                            break
                        
                        val1 = trial1["objective_values"][obj_name]
                        val2 = trial2["objective_values"][obj_name]
                        
                        # For minimization, lower is better; for maximization, higher is better
                        if obj["minimize"]:
                            if val2 > val1:  # trial2 is worse
                                dominates = False
                                break
                            if val2 < val1:  # trial2 is better
                                at_least_one_better = True
                        else:
                            if val2 < val1:  # trial2 is worse
                                dominates = False
                                break
                            if val2 > val1:  # trial2 is better
                                at_least_one_better = True
                    
                    if dominates and at_least_one_better:
                        is_dominated = True
                        break
                
                if not is_dominated:
                    pareto_front.append({
                        "parameters": trial1["parameters"],
                        "objectives": trial1["objective_values"]
                    })
            
            logger.info(f"Found {len(pareto_front)} Pareto-optimal solutions")
            return pareto_front
        
        except Exception as e:
            logger.error(f"Error calculating Pareto front: {e}")
            logger.error(traceback.format_exc())
            return {"error": f"Failed to calculate Pareto front: {str(e)}"}