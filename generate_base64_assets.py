import base64
import os

def get_b64(path):
    with open(path, 'rb') as f:
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode('utf-8')

logo_b64 = get_b64('app/assets/app_logo.png')
cam_b64 = get_b64('app/assets/icon_camera.png')
rep_b64 = get_b64('app/assets/icon_report.png')

content = f'''// Auto-generated 100% Reliable In-Memory Base64 Assets
export const APP_LOGO = "{logo_b64}";
export const ICON_CAMERA = "{cam_b64}";
export const ICON_REPORT = "{rep_b64}";
'''

os.makedirs('app/src/constants', exist_ok=True)
with open('app/src/constants/assets.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Generated app/src/constants/assets.ts successfully!')
