import re

with open("generate_scripts.py", "r") as f:
    content = f.read()

pattern = r"(      - PORT=6767\n)"
replacement = r"\1      - JTG_HOST_DATA_PATH=${PWD}/.data\n"
content = re.sub(pattern, replacement, content)

pattern2 = r"(      - PORT=3000\n)"
replacement2 = r"\1      - JTG_HOST_DATA_PATH=${PWD}/.data\n"
content = re.sub(pattern2, replacement2, content)

with open("generate_scripts.py", "w") as f:
    f.write(content)
