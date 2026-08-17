import os
import base64
import time
import re

app_dir = os.path.dirname(__file__)
dist_dir = os.path.join(app_dir, "dist")
index_html = os.path.join(dist_dir, "index.html")

ionicons_path = os.path.join(app_dir, "node_modules", "@expo", "vector-icons", "build", "vendor", "react-native-vector-icons", "Fonts", "Ionicons.ttf")

if os.path.exists(ionicons_path) and os.path.exists(index_html):
    with open(ionicons_path, "rb") as f:
        ionicons_b64 = base64.b64encode(f.read()).decode("utf-8")
    
    with open(index_html, "r", encoding="utf-8") as f:
        content = f.read()

    ts = int(time.time())

    cache_meta = """
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <script>
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(regs) {
          for (var r of regs) { r.unregister(); }
        });
      }
    </script>
    """

    # Clean previous font styles
    font_style = f"""
    <style id="embedded-icon-fonts">
      @font-face {{
        font-family: 'Ionicons';
        src: url(data:font/truetype;charset=utf-8;base64,{ionicons_b64}) format('truetype');
        font-weight: normal;
        font-style: normal;
      }}
      @font-face {{
        font-family: 'ionicons';
        src: url(data:font/truetype;charset=utf-8;base64,{ionicons_b64}) format('truetype');
        font-weight: normal;
        font-style: normal;
      }}
    </style>
    """

    content = content.replace('src="/_expo/', f'src="./_expo/')
    content = content.replace('href="/_expo/', f'href="./_expo/')
    content = content.replace('href="/favicon.ico"', f'href="./favicon.ico?v={ts}"')

    # Add cache buster query string to all scripts and stylesheets
    content = re.sub(r'src="(\./_expo/[^"]+\.js)"', rf'src="\1?v={ts}"', content)

    if "</head>" in content:
        content = content.replace("</head>", cache_meta + "\n" + font_style + "\n</head>")

    with open(index_html, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Successfully embedded Ionicons font and cache busters (v={ts}) into dist/index.html!")
else:
    print("Ionicons.ttf or index.html not found:", ionicons_path, index_html)
