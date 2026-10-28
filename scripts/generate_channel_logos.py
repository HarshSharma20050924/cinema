import os
from PIL import Image, ImageDraw, ImageFont

def generate_all_channel_logos():
    output_dir = 'server/data/channel_logos'
    os.makedirs(output_dir, exist_ok=True)

    inter_bold = './vega-app/node_modules/expo-dev-menu/android/src/debug/res/font/inter_bold.ttf'
    if not os.path.exists(inter_bold):
        inter_bold = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

    providers = [
        {"id": "hdhub4u", "label": "HDHUB4U", "code": "HD"},
        {"id": "4khdhub", "label": "4K HDHUB", "code": "4K"},
        {"id": "vega", "label": "VEGAMOVIES", "code": "VM"},
        {"id": "moviesmod", "label": "MOVIESMOD", "code": "MM"},
        {"id": "drive", "label": "MOVIESDRIVE", "code": "MD"},
        {"id": "katmoviehd", "label": "KATMOVIES", "code": "KM"},
        {"id": "topmovies", "label": "TOPMOVIES", "code": "TM"},
        {"id": "uhdmovies", "label": "UHDMOVIES", "code": "UH"},
        {"id": "uhd", "label": "UHDMOVIES", "code": "UH"},
        {"id": "movieBoxWeb", "label": "MOVIEBOX", "code": "MB"},
        {"id": "bollyflix", "label": "BOLLYFLIX", "code": "BF"},
        {"id": "moviesflix", "label": "MOVIESFLIX", "code": "MF"},
        {"id": "extramovies", "label": "EXTRAMOVIES", "code": "EM"},
        {"id": "multimovies", "label": "MULTIMOVIES", "code": "MM"},
        {"id": "multi", "label": "MULTIMOVIES", "code": "MM"},
        {"id": "world4ufree", "label": "WORLD4UFREE", "code": "W4"},
        {"id": "skymovieshd", "label": "SKYMOVIESHD", "code": "SM"},
        {"id": "filmyfly", "label": "FILMYFLY", "code": "FF"},
        {"id": "cinevood", "label": "CINEVOOD", "code": "CV"},
        {"id": "luxmovies", "label": "LUXMOVIES", "code": "LM"},
        {"id": "eonmovies", "label": "EONMOVIES", "code": "EM"},
        {"id": "moviezwap", "label": "MOVIEZWAP", "code": "MZ"},
        {"id": "dramacool", "label": "DRAMACOOL", "code": "DC"},
        {"id": "kisskh", "label": "KISSKH", "code": "KH"},
        {"id": "gogoanime", "label": "GOGOANIME", "code": "GA"},
        {"id": "animerulz", "label": "ANIMERULZ", "code": "AR"},
        {"id": "animeworld", "label": "ANIMEWORLD", "code": "AW"},
        {"id": "anikoto", "label": "ANIKOTO", "code": "AK"},
        {"id": "hianime", "label": "HIANIME", "code": "HA"},
        {"id": "yts", "label": "YTS", "code": "YT"},
        {"id": "1337x", "label": "1337X", "code": "13"},
        {"id": "thepiratebay", "label": "PIRATEBAY", "code": "PB"},
        {"id": "tpb", "label": "PIRATEBAY", "code": "PB"},
        {"id": "gokuhd", "label": "GOKUHD", "code": "GK"},
        {"id": "showbox", "label": "SHOWBOX", "code": "SB"},
        {"id": "ridomovies", "label": "RIDOMOVIES", "code": "RM"},
        {"id": "flixhq", "label": "FLIXHQ", "code": "FH"},
        {"id": "protonmovies", "label": "PROTONMOVIES", "code": "PM"},
        {"id": "cinemaluxe", "label": "CINEMALUXE", "code": "CL"},
        {"id": "zeefliz", "label": "ZEEFLIZ", "code": "ZF"},
        {"id": "movies4u", "label": "MOVIES4U", "code": "M4"},
        {"id": "netflixMirror", "label": "NETFLIX", "code": "NF"},
        {"id": "disneyMirror", "label": "DISNEY+", "code": "DP"},
        {"id": "primeMirror", "label": "PRIME VIDEO", "code": "PV"},
        {"id": "castle", "label": "CASTLE", "code": "CA"},
        {"id": "mxplayer", "label": "MX PLAYER", "code": "MX"},
        {"id": "animesalt", "label": "ANIMESALT", "code": "AS"},
        {"id": "gramcinema", "label": "GRAMCINEMA", "code": "GC"},
        {"id": "olamovies", "label": "OLAMOVIES", "code": "OM"},
    ]

    w, h = 512, 512
    mono_font = ImageFont.truetype(inter_bold, 175)

    top_color = (229, 9, 20)       # Vivid Cinema Red
    bottom_color = (160, 8, 8)     # Deep Cinema Red

    for item in providers:
        img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # 1. Linear Red Gradient Canvas
        for y in range(h):
            ratio = y / float(h)
            r = int(top_color[0] * (1 - ratio) + bottom_color[0] * ratio)
            g = int(top_color[1] * (1 - ratio) + bottom_color[1] * ratio)
            b = int(top_color[2] * (1 - ratio) + bottom_color[2] * ratio)
            draw.line([(0, y), (w, y)], fill=(r, g, b, 255))

        # 2. Subtle central spotlight
        highlight = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        h_draw = ImageDraw.Draw(highlight)
        h_draw.ellipse([70, 50, 442, 422], fill=(255, 75, 75, 30))
        img = Image.alpha_composite(img, highlight)
        draw = ImageDraw.Draw(img)

        # 3. Two-letter Bold Black Monogram in Center (Camera removed!)
        code = item["code"]
        bbox = draw.textbbox((0, 0), code, font=mono_font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = (w - tw) // 2
        ty = (h // 2) - (th // 2) - 22

        # Draw subtle deep shadow for 3D punch
        draw.text((tx + 2, ty + 3), code, font=mono_font, fill=(50, 4, 4, 130))
        # Draw solid bold black monogram
        draw.text((tx, ty), code, font=mono_font, fill=(15, 15, 18, 255))

        # 4. Smooth bottom vignette for label readability
        vignette = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        v_draw = ImageDraw.Draw(vignette)
        start_y = int(h * 0.70)
        for y in range(start_y, h):
            alpha = int(230 * ((y - start_y) / (h - start_y)))
            v_draw.line([(0, y), (w, y)], fill=(8, 8, 12, alpha))
        img = Image.alpha_composite(img, vignette)
        draw = ImageDraw.Draw(img)

        # 5. Spaced label at bottom
        label = item["label"]
        if len(label) <= 6:
            spaced_label = "   ".join(list(label))
            lbl_size = 26
        elif len(label) <= 9:
            spaced_label = "  ".join(list(label))
            lbl_size = 24
        elif len(label) <= 12:
            spaced_label = " ".join(list(label))
            lbl_size = 22
        else:
            spaced_label = " ".join(list(label))
            lbl_size = 19

        lbl_font = ImageFont.truetype(inter_bold, lbl_size)
        lbbox = draw.textbbox((0, 0), spaced_label, font=lbl_font)
        ltw = lbbox[2] - lbbox[0]
        ltx = (w - ltw) // 2
        lty = int(h * 0.82)

        draw.text((ltx, lty), spaced_label, font=lbl_font, fill=(255, 255, 255, 255))

        out_path = os.path.join(output_dir, f"{item['id']}_logo.png")
        img.convert("RGB").save(out_path, "PNG")

    print(f"✅ Generated {len(providers)} bold monogram logos successfully in {output_dir}")

if __name__ == '__main__':
    generate_all_channel_logos()
