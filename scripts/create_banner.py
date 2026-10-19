import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_red_cinema_banner():
    # 1200x630 high-res banner, fits mobile perfectly
    w, h = 1200, 630
    inter_bold = './vega-app/node_modules/expo-dev-menu/android/src/debug/res/font/inter_bold.ttf'
    inter_regular = './vega-app/node_modules/expo-dev-menu/android/src/debug/res/font/inter_regular.ttf'
    output_path = 'server/data/cinema_hub_banner.png'
    os.makedirs('server/data', exist_ok=True)

    # 1. Base Rich Dark Red Gradient Background
    img = Image.new("RGBA", (w, h), (14, 10, 12, 255))
    
    # Smooth rich crimson glow from center & top
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    
    # Big central vibrant red aura
    cx, cy = w // 2, int(h * 0.40)
    for r in range(480, 0, -8):
        # Crimson Red (#E50914 to #880005)
        alpha = int(95 * (1 - (r / 480) ** 1.3))
        g_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(225, 15, 25, alpha))
        
    glow = glow.filter(ImageFilter.GaussianBlur(35))
    img = Image.alpha_composite(img, glow)

    # 2. Cinema Camera Badge
    base_logo = Image.open('public/logo.png').convert("RGBA")
    cam_size = 190
    logo_resized = base_logo.resize((cam_size, cam_size), Image.Resampling.LANCZOS)
    
    mask = Image.new("L", (cam_size, cam_size), 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.rounded_rectangle([0, 0, cam_size, cam_size], radius=44, fill=255)
    
    icon_x = (w - cam_size) // 2
    icon_y = int(h * 0.14)
    
    # Sleek drop shadow
    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.rounded_rectangle(
        [icon_x - 6, icon_y + 10, icon_x + cam_size + 6, icon_y + cam_size + 20],
        radius=48,
        fill=(0, 0, 0, 200)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    img = Image.alpha_composite(img, shadow)
    
    img.paste(logo_resized, (icon_x, icon_y), mask)

    # 3. Typography: Clean, Friendly, Bold
    draw = ImageDraw.Draw(img)
    
    # Title: CINEMA
    title_text = "C I N E M A"
    title_font = ImageFont.truetype(inter_bold, 48)
    t_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    t_w = t_bbox[2] - t_bbox[0]
    draw.text(((w - t_w) // 2, icon_y + cam_size + 24), title_text, font=title_font, fill=(255, 255, 255, 255))

    # Subtitle: Friendly user terms
    sub_text = "WATCH & DOWNLOAD MOVIES · FAST & FREE"
    sub_font = ImageFont.truetype(inter_bold, 18)
    s_bbox = draw.textbbox((0, 0), sub_text, font=sub_font)
    s_w = s_bbox[2] - s_bbox[0]
    draw.text(((w - s_w) // 2, icon_y + cam_size + 88), sub_text, font=sub_font, fill=(255, 110, 115, 240))

    # Features: Mobile Friendly
    feat_text = "4K UHD  ·  BOLLYWOOD  ·  HOLLYWOOD  ·  ANIME  ·  WEB SERIES"
    feat_font = ImageFont.truetype(inter_regular, 14)
    f_bbox = draw.textbbox((0, 0), feat_text, font=feat_font)
    f_w = f_bbox[2] - f_bbox[0]
    draw.text(((w - f_w) // 2, icon_y + cam_size + 120), feat_text, font=feat_font, fill=(215, 215, 225, 220))

    img.convert("RGB").save(output_path, "PNG")
    print(f"✅ Generated rich red banner: {output_path}")

if __name__ == '__main__':
    create_red_cinema_banner()
