import os
from PIL import Image, ImageDraw, ImageFont

def generate_bot_avatars():
    base_image_path = 'server/data/bot_icon_base.png'
    output_dir = 'server/data/channel_logos'
    os.makedirs(output_dir, exist_ok=True)

    inter_bold = './vega-app/node_modules/expo-dev-menu/android/src/debug/res/font/inter_bold.ttf'
    if not os.path.exists(inter_bold):
        inter_bold = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

    base_img = Image.open(base_image_path).convert("RGBA")
    w, h = 512, 512
    base_resized = base_img.resize((w, h), Image.Resampling.LANCZOS)

    bot_definitions = [
        {"id": "bot_desi", "label": "CINEMAWOOD"},
        {"id": "bot_series", "label": "OTT SERIES"},
        {"id": "bot_4k", "label": "CINEMA 4K"},
        {"id": "bot_anime", "label": "ANIME BOT"},
        {"id": "bot_cinema", "label": "CINEMA BOT"},
    ]

    for bot in bot_definitions:
        img = base_resized.copy()

        # 1. Smooth bottom dark vignette for clean contrast
        vignette = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        v_draw = ImageDraw.Draw(vignette)
        start_y = int(h * 0.72) # ~368
        for y in range(start_y, h):
            factor = (y - start_y) / float(h - start_y)
            alpha = int(220 * (factor ** 1.3))
            v_draw.line([(0, y), (w, y)], fill=(12, 10, 15, alpha))

        img = Image.alpha_composite(img, vignette)
        draw = ImageDraw.Draw(img)

        # 2. Spaced uppercase label at bottom
        label = bot["label"]
        if len(label) <= 8:
            spaced_label = "   ".join(list(label))
            lbl_size = 24
        elif len(label) <= 11:
            spaced_label = "  ".join(list(label))
            lbl_size = 22
        else:
            spaced_label = " ".join(list(label))
            lbl_size = 20

        font = ImageFont.truetype(inter_bold, lbl_size)
        bbox = draw.textbbox((0, 0), spaced_label, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = (w - tw) // 2
        ty = int(h * 0.84)

        # Subtle dark text shadow
        draw.text((tx + 1, ty + 2), spaced_label, font=font, fill=(0, 0, 0, 180))
        # Crisp white text
        draw.text((tx, ty), spaced_label, font=font, fill=(255, 255, 255, 255))

        out_path = os.path.join(output_dir, f"{bot['id']}_logo.png")
        img.convert("RGB").save(out_path, "PNG")
        print(f"✅ Generated {out_path} with label '{spaced_label}'")

if __name__ == '__main__':
    generate_bot_avatars()
