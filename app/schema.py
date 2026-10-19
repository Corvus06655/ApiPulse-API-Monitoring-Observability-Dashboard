from pydantic import BaseModel,HttpUrl,Field,ConfigDict
from datetime import datetime


class TargetCreate(BaseModel):
    name:str =Field(min_length=1,max_length=100)
    url:HttpUrl


class TargetUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    url: HttpUrl

class TargetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    url: str
    created_at: datetime