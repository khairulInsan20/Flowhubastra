from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class Role(str, Enum):
    PIC = "PIC Accounting"
    COORDINATOR = "Koordinator"
    SPV = "SPV"
    MANAGER = "Manager"
    SECRETARY = "Sekretaris Divisi"


class Allocation(BaseModel):
    category: str
    percentage: int = Field(ge=0, le=100)


class TripCreate(BaseModel):
    title: str = Field(min_length=4, max_length=120)
    region: str
    branch: str
    departure_city: str
    start_date: str
    end_date: str
    total_budget: int = Field(gt=0)
    allocations: List[Allocation]
    traveler_name: str
    traveler_phone: str

    @model_validator(mode="after")
    def validate_trip_allocation_total(self):
        if sum(item.percentage for item in self.allocations) != 100:
            raise ValueError("Total proporsi anggaran harus tepat 100%.")
        return self


class ScheduleCreate(BaseModel):
    title: str = Field(min_length=4, max_length=120)
    region: str
    branch: str
    departure_city: str
    start_date: str
    end_date: str
    total_budget: int = Field(gt=0)
    pic_profile_id: str


class AllocationUpdate(BaseModel):
    actor_role: Role
    pic_profile_id: str
    allocations: List[Allocation]

    @model_validator(mode="after")
    def validate_allocation_total(self):
        if sum(item.percentage for item in self.allocations) != 100:
            raise ValueError("Total proporsi anggaran harus tepat 100%.")
        return self

class WorkflowAction(BaseModel):
    actor_role: Role
    action: str
    comment: Optional[str] = Field(default="", max_length=500)


class BookingCreate(BaseModel):
    actor_role: Role
    flight_reference: str = Field(min_length=3, max_length=100)
    hotel_reference: str = Field(min_length=3, max_length=100)
    note: Optional[str] = Field(default="", max_length=500)


class ExpenseItem(BaseModel):
    category: str
    description: str = Field(min_length=3, max_length=200)
    amount: int = Field(gt=0)
    proof_name: Optional[str] = ""


class RealizationCreate(BaseModel):
    actor_role: Role
    expenses: List[ExpenseItem] = Field(min_length=1)
    reimbursement_account: str = Field(min_length=6, max_length=80)
    survey_rating: int = Field(ge=1, le=5)
    survey_note: str = Field(min_length=10, max_length=1000)


class MockUploadCreate(BaseModel):
    actor_role: Role
    file_name: str = Field(min_length=3, max_length=160)
    evidence_type: str


class TravelRecommendationQuery(BaseModel):
    origin: str
    destination: str
    budget: int = Field(gt=0)


class ApiMessage(BaseModel):
    message: str