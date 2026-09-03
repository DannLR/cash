from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)


class OwnerUser(BaseModel):
    id: str
    email: str
    name: str


class LoginResponse(BaseModel):
    user: OwnerUser


class AuthMessageResponse(BaseModel):
    message: str