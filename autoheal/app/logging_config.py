import logging
import sys
from app.config import settings

def setup_logging():
    log_format = "%(asctime)s [%(levelname)s] [%(name)s]: %(message)s"
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL, logging.INFO),
        format=log_format,
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )
    logger = logging.getLogger("autoheal")
    logger.info("Logging initialized at %s level (DRY_RUN=%s)", settings.LOG_LEVEL, settings.DRY_RUN)
    return logger

logger = setup_logging()
