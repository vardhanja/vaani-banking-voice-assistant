# create or recreate the venv with Python 3.11
python3.11 -m venv .venv

# activate it
source .venv/bin/activate

# upgrade pip in the venv (optional but recommended)
python -m pip install --upgrade pip

# install project deps
python -m pip install -r requirements.txt
############################################

Activate environment:
source .venv/bin/activate

Seed backend:
python -m backend.db.seed

backend:
.venv/bin/python main.py

Frontend:
run inside frontend:  npm run dev

