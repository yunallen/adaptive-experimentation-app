from pydantic import BaseModel
from typing import Dict, List, Any, Optional

class Parameter(BaseModel):
    name: str
    type: str  # "range", "choice", or "fixed"
    bounds: Optional[List[float]] = None
    values: Optional[List[Any]] = None
    value: Optional[Any] = None

class Objective(BaseModel):
    name: str
    minimize: bool = False

class Experiment(BaseModel):
    name: str
    parameters: List[Parameter]
    objectives: List[Objective]
    primary_objective: Optional[str] = None

class ExperimentResult(BaseModel):
    trial_id: int
    parameters: Dict[str, Any]
    objective_values: Dict[str, float]
    metadata: Optional[Dict[str, Any]] = None

class ExperimentResponse(BaseModel):
    experiment_id: str
    status: str

class TrialResponse(BaseModel):
    trial_id: int
    parameters: Dict[str, Any]