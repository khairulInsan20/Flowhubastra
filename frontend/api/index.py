import sys
from pathlib import Path

BACKEND_DIR = Path("/var/task/backend")
sys.path.insert(0, str(BACKEND_DIR))

from server import app
