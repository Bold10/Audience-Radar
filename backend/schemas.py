from typing import List, Literal

from pydantic import BaseModel, Field


class AudienceOption(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    description: str = Field(min_length=5, max_length=300)
    signals: List[str] = Field(default_factory=list, max_length=5)


class AudienceOptions(BaseModel):
    options: List[AudienceOption] = Field(min_length=3, max_length=3)


class ResearcherItem(BaseModel):
    platform: Literal["x", "telegram", "reddit", "youtube"]
    community: str = Field(min_length=2, max_length=80)
    reason: str = Field(min_length=5, max_length=200)
    show_up: str = Field(min_length=2, max_length=140)


class ResearcherRanking(BaseModel):
    items: List[ResearcherItem] = Field(min_length=2, max_length=8)


class ScriptBeat(BaseModel):
    time: str
    line: str


class LaunchKit(BaseModel):
    x_post: str = Field(min_length=10, max_length=600)
    telegram_message: str = Field(min_length=10, max_length=1500)
    card_headline: str = Field(min_length=3, max_length=90)
    card_subline: str = Field(min_length=3, max_length=160)
    video_script: List[ScriptBeat] = Field(min_length=3, max_length=8)


TASK_SCHEMAS = {
    "audience_options": AudienceOptions,
    "researcher_ranking": ResearcherRanking,
    "launch_kit": LaunchKit,
}
