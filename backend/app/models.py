from enum import Enum
from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class AspectRatio(str, Enum):
    PORTRAIT_9_16 = "9:16"
    SQUARE_1_1 = "1:1"
    LANDSCAPE_16_9 = "16:9"

class FitMode(str, Enum):
    CROP_FILL = "crop_fill"
    BLUR_PADDING = "blur_padding"
    BLACK_BARS = "black_bars"
    WHITE_BARS = "white_bars"
    SQUARE_CENTER = "square_center"

class SubtitleStyle(str, Enum):
    NONE = "none"                        # No subtitles / captions turned off
    SINGLE_WORD_POP = "single_word_pop"  # 1-Word explosive punchy pop
    HORMOZI = "hormozi"                  # Bold uppercase yellow bounce
    MRBEAST = "mrbeast"                  # Dynamic high-contrast green burst
    ALI_ABDAAL = "ali_abdaal"            # Clean modern sans with lavender accent
    IMAN_GADZHI = "iman_gadzhi"          # Luxury bold italic with golden shimmer
    TIKTOK_BOUNCE = "tiktok_bounce"      # High-energy TikTok red/coral karaoke
    PODCAST_BOX = "podcast_box"          # Dark translucent pill box with white text
    COMIC_PUNCH = "comic_punch"          # Angled dynamic comic font with yellow fill
    VELOCITY = "velocity"                # Electric cyan pop with sharp black outline
    MINIMAL = "minimal"                  # Elegant clean editorial sans

class JobStatus(str, Enum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    TRANSCRIBING = "transcribing"
    AWAITING_CLIPS = "awaiting_clips"
    SELECTING = "selecting"
    TRACKING = "tracking"
    RENDERING = "rendering"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float

class ClipCandidate(BaseModel):
    id: str
    title: str
    start_time: float
    end_time: float
    duration: float
    hook_score: int = Field(default=85, ge=0, le=100)
    hook_reason: str = ""
    suggested_headline: str = ""
    hook: Optional[str] = ""
    description: Optional[str] = ""
    hashtags: List[str] = []
    rendered_url: Optional[str] = None

class VideoInfoRequest(BaseModel):
    url: str

class VideoInfoResponse(BaseModel):
    title: str
    duration: float
    thumbnail: Optional[str] = None
    uploader: Optional[str] = None
    available_qualities: List[str] = []

class CreateJobRequest(BaseModel):
    video_url: Optional[str] = None
    upload_id: Optional[str] = None
    subtitle_upload_id: Optional[str] = None
    reuse_job_id: Optional[str] = None
    reuse_video_id: Optional[str] = None
    colab_transcribe_url: Optional[str] = None
    video_quality: Optional[str] = "1080p"
    aspect_ratio: AspectRatio = AspectRatio.PORTRAIT_9_16
    fit_mode: FitMode = FitMode.BLUR_PADDING
    subtitle_style: SubtitleStyle = SubtitleStyle.HORMOZI
    caption_position: Optional[str] = "bottom"  # "top", "center", "bottom"
    caption_offset_x: Optional[int] = 0         # Horizontal fine-tune in pixels
    caption_offset_y: Optional[int] = 0         # Vertical fine-tune in pixels
    caption_scale: Optional[float] = 1.0        # Font size multiplier (0.8 - 1.4)
    num_clips: int = Field(default=3, ge=1, le=50)
    min_clip_duration: int = Field(default=25, ge=10, le=120)
    max_clip_duration: int = Field(default=60, ge=15, le=180)
    selection_mode: Optional[str] = "ai_prompt" # "ai_prompt" or "auto"
    custom_clips: Optional[List[Dict]] = None
    gemini_api_key: Optional[str] = None
    device: Optional[str] = None
    music_upload_id: Optional[str] = None
    music_volume: Optional[float] = 0.20
    original_volume: Optional[float] = 1.00
    music_start_time: Optional[float] = 0.0
    template_preset: Optional[str] = "none"
    template_bg_color: Optional[str] = ""
    template_card_padding: Optional[bool] = False
    template_corner_radius: Optional[int] = 14
    template_hook_enabled: Optional[bool] = False
    template_hook_mode: Optional[str] = "ai_hook"
    template_hook_text: Optional[str] = None
    template_hook_color: Optional[str] = "#000000"
    template_hook_bg: Optional[str] = "transparent"
    template_hook_bg_color: Optional[str] = "#facc15"
    template_hook_y: Optional[int] = 48
    template_hook_x: Optional[float] = None
    template_logo_upload_id: Optional[str] = None
    template_logo_enabled: Optional[bool] = False
    template_logo_position: Optional[str] = "top_left"
    template_logo_x: Optional[float] = None
    template_logo_y: Optional[float] = None
    template_logo_scale: Optional[float] = 1.0
    template_logo_size: Optional[int] = 36
    template_logo_opacity: Optional[float] = 1.0
    template_watermark_enabled: Optional[bool] = False
    template_watermark_text: Optional[str] = None
    template_watermark_position: Optional[str] = "bottom_center"
    template_watermark_x: Optional[float] = None
    template_watermark_y: Optional[float] = None
    template_watermark_color: Optional[str] = "#a1a1aa"
    template_watermark_opacity: Optional[float] = 0.85
    template_social_card_enabled: Optional[bool] = False
    template_channel_name: Optional[str] = ""
    template_channel_handle: Optional[str] = ""
    template_like_subscribe_enabled: Optional[bool] = False
    template_social_card_bg: Optional[str] = "#0c0f14"
    template_social_footer_enabled: Optional[bool] = False

class SubmitClipsRequest(BaseModel):
    clips: Optional[List[Dict]] = None
    raw_json: Optional[str] = None
    use_heuristic: Optional[bool] = False

class GeneratePromptRequest(BaseModel):
    num_clips: int = 3
    min_duration: int = 25
    max_duration: int = 60
    video_title: Optional[str] = ""
    subtitle_upload_id: Optional[str] = None
    job_id: Optional[str] = None

class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: int = 0
    stage_message: str = "Job initialized"
    video_title: Optional[str] = None
    duration: Optional[float] = None
    clips: List[ClipCandidate] = []
    error: Optional[str] = None
    prompt_text: Optional[str] = None
    transcript_summary: Optional[str] = None
    created_at: Optional[str] = None

class ActivateLicenseRequest(BaseModel):
    license_key: str
    name: str = ""
    phone: str = ""

class LicenseStatusResponse(BaseModel):
    is_activated: bool
    license_key: Optional[str] = None
    registered_name: Optional[str] = None
    registered_phone: Optional[str] = None
    hwid: str
    offline_ready: bool = True
    status: str = "unlicensed"
    message: Optional[str] = None

