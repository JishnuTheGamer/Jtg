import json
data = json.load(open('tsconfig.json'))
data['compilerOptions']['noUnusedLocals'] = False
data['compilerOptions']['noUnusedParameters'] = False
json.dump(data, open('tsconfig.json', 'w'), indent=2)
