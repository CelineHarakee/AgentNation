from fastapi import APIRouter
from app.usecases.usecase1.coa import run_coa
from app.usecases.usecase1.schemas import UseCase1Input, FinalResponse

router = APIRouter()


@router.post(
    "/usecase1/evaluate",
    response_model=FinalResponse,
    summary="Evaluate a policy using Use Case 1"
)
def evaluate_usecase1(input_data: UseCase1Input):
    """
    Runs the Policy Assessment & Risk Escalation use case.
    """
    return run_coa(input_data)
