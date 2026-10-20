import os
from PIL import Image, ImageDraw, ImageFont

def generate_all_vega_logos():
    base_logo_path = 'public/logo.png'
    output_dir = 'server/data/channel_logos'
    os.makedirs(output_dir, exist_ok=True)

    inter_bold = './vega-app/node_modules/expo-dev-menu/android/src/debug/res/font/inter_bold.ttf'

    # All actual catalog providers from Vega (filtering out pure iframe resolvers like autoEmbed, vidsrc)
    providers = [
        {"id": "hdhub4u", "label": "HDHUB4U"},
        {"id": "4khdhub", "label": "4K HDHUB"},
        {"id": "vega", "label": "VEGAMOVIES"},
        {"id": "moviesmod", "label": "MOVIESMOD"},
        {"id": "drive", "label": "MOVIESDRIVE"},
        {"id": "katmoviehd", "label": "KATMOVIES"},
        {"id": "topmovies", "label": "TOPMOVIES"},
        {"id": "uhdmovies", "label": "UHDMOVIES"},
        {"id": "movieBoxWeb", "label": "MOVIEBOX"},
        {"id": "bollyflix", "label": "BOLLYFLIX"},
        {"id": "moviesflix", "label": "MOVIESFLIX"},
        {"id": "extramovies", "label": "EXTRAMOVIES"},
        {"id": "multimovies", "label": "MULTIMOVIES"},
        {"id": "world4ufree", "label": "WORLD4UFREE"},
        {"id": "skymovieshd", "label": "SKYMOVIESHD"},
        {"id": "filmyfly", "label": "FILMYFLY"},
        {"id": "cinevood", "label": "CINEVOOD"},
        {"id": "luxmovies", "label": "LUXMOVIES"},
        {"id": "eonmovies", "label": "EONMOVIES"},
        {"id": "moviezwap", "label": "MOVIEZWAP"},
        {"id": "dramacool", "label": "DRAMACOOL"},
        {"id": "kisskh", "label": "KISSKH"},
        {"id": "gogoanime", "label": "GOGOANIME"},
        {"id": "animerulz", "label": "ANIMERULZ"},
        {"id": "animeworld", "label": "ANIMEWORLD"},
        {"id": "anikoto", "label": "ANIKOTO"},
        {"id": "hianime", "label": "HIANIME"},
        {"id": "yts", "label": "YTS"},
        {"id": "1337x", "label": "1337X"},
        {"id": "thepiratebay", "label": "PIRATEBAY"},
        {"id": "gokuhd", "label": "GOKUHD"},
        {"id": "showbox", "label": "SHOWBOX"},
        {"id": "ridomovies", "label": "RIDOMOVIES"},
        {"id": "flixhq", "label": "FLIXHQ"},
        {"id": "protonmovies", "label": "PROTONMOVIES"},
        {"id": "cinemaluxe", "label": "CINEMALUXE"},
        {"id": "zeefliz", "label": "ZEEFLIZ"},
        {"id": "movies4u", "label": "MOVIES4U"},
        {"id": "netflixMirror", "label": "NETFLIX"},
        {"id": "disneyMirror", "label": "DISNEY+"},
        {"id": "primeMirror", "label": "PRIME VIDEO"},
        {"id": "castle", "label": "CASTLE"},
        {"id": "mxplayer", "label": "MX PLAYER"},
        {"id": "animesalt", "label": "ANIMESALT"},
        # Category Bots
        {"id": "bot_desi", "label": "CINEMAWOOD"},
        {"id": "bot_series", "label": "OTT SERIES"},
        {"id": "bot_4k", "label": "CINEMA 4K"},
        {"id": "bot_anime", "label": "ANIME"}
    ]

    base_img = Image.open(base_logo_path).convert("RGBA")
    w, h = base_img.size

    for item in providers:
        img = base_img.copy()

        # 1. Smooth gradient vignette at bottom
        gradient_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        g_draw = ImageDraw.Draw(gradient_layer)
        start_y = int(h * 0.73)
        for y in range(start_y, h):
            alpha = int(220 * ((y - start_y) / (h - start_y)))
            g_draw.line([(0, y), (w, y)], fill=(10, 10, 14, alpha))

        img = Image.alpha_composite(img, gradient_layer)

        # 2. Sleek typography with letter-spacing
        label = item["label"]
        if len(label) <= 6:
            spaced_label = "   ".join(list(label))
            font_size = 25
        elif len(label) <= 9:
            spaced_label = "  ".join(list(label))
            font_size = 23
        elif len(label) <= 12:
            spaced_label = " ".join(list(label))
            font_size = 21
        else:
            spaced_label = " ".join(list(label))
            font_size = 18

        font = ImageFont.truetype(inter_bold, font_size)
        draw = ImageDraw.Draw(img)

        bbox = draw.textbbox((0, 0), spaced_label, font=font)
        tw = bbox[2] - bbox[0]

        tx = (w - tw) // 2
        ty = int(h * 0.82)

        draw.text((tx, ty), spaced_label, font=font, fill=(255, 255, 255, 255))

        out_path = os.path.join(output_dir, f"{item['id']}_logo.png")
        img.convert("RGB").save(out_path, "PNG")

    print(f"✅ Generated {len(providers)} minimal logos successfully in {output_dir}")

if __name__ == '__main__':
    generate_all_vega_logos()
