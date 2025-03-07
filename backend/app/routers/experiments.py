from fastapi import APIRouter, HTTPException
from app.models import (
    Experiment, ExperimentResult, ExperimentResponse,
    TrialResponse
)
from app.optimization import ExperimentManager
import uuid

router = APIRouter()
experiment_manager = ExperimentManager()

@router.post("/experiments", response_model=ExperimentResponse)
def create_experiment(experiment: Experiment):
    """Create a new experiment with specified parameters and objectives."""
    # Generate a unique ID
    experiment_id = str(uuid.uuid4())
    
    # Make sure at least one objective is defined
    if not experiment.objectives or len(experiment.objectives) == 0:
        raise HTTPException(status_code=400, detail="At least one objective must be defined")
    
    success = experiment_manager.create_experiment(experiment_id, experiment)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to create experiment")
    
    return {"experiment_id": experiment_id, "status": "created"}

@router.get("/experiments/{experiment_id}/next_trial", response_model=TrialResponse)
def get_next_trial(experiment_id: str):
    """Get parameters for the next trial in an experiment."""
    parameters, trial_id = experiment_manager.get_next_trial(experiment_id)
    
    if parameters is None:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    return {
        "trial_id": trial_id,
        "parameters": parameters
    }

@router.post("/experiments/{experiment_id}/complete_trial")
def complete_trial(experiment_id: str, result: ExperimentResult):
    """Submit results for a completed trial."""
    success = experiment_manager.complete_trial(
        experiment_id, result.trial_id, result.objective_values
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Experiment or trial not found")
    
    return {"status": "success"}

@router.get("/experiments/{experiment_id}/pareto_front")
def get_pareto_front(experiment_id: str):
    """Get the Pareto front for multi-objective experiments."""
    pareto_front = experiment_manager.get_pareto_front(experiment_id)
    
    if pareto_front is None:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    return pareto_front