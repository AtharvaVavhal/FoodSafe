import sys
import os

BASE = os.path.dirname(os.path.abspath(__file__))

sys.path.insert(0, BASE)                          # backend/
sys.path.insert(0, os.path.join(BASE, 'app'))     # backend/app/  <-- core, db live here
sys.path.insert(0, os.path.join(BASE, 'ml'))      # backend/ml/

from main import app
import uvicorn

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)