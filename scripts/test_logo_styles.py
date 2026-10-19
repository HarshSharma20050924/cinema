import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

base_logo_path = 'public/logo.png'
inter_bold = './vega-app/node_modules/expo-dev-menu/android/src/debug/res/font/inter_bold.ttf'

def create_sample(style_name, label):
    img = Image.open(base_logo_path).convert("RGBA")
    w, h = img.size
    
    font_size = 26
    font = ImageFont.truetype(inter_bold, font_size)
    
    # Tracking / Spacing
    spaced_label = "  ".join(list(label)) if len(label) <= 8 else " ".join(list(label))
    
    dummy_draw = ImageDraw.Draw(img)
    bbox = dummy_draw.textbbox((0, 0), spaced_label, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    
    if style_name == "borderless_glow":
        # Concept 1: Borderless with soft diffused dark glow
        glow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow_layer)
        
        tx = (w - tw) // 2
        ty = int(h * 0.81)
        
        # Soft dark glow behind text
        for offset_x in range(-3, 4):
            for offset_y in range(-3, 4):
                glow_draw.text((tx + offset_x, ty + offset_y), spaced_label, font=font, fill=(0, 0, 0, 160))
        glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(4))
        
        # Text layer
        text_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        t_draw = ImageDraw.Draw(text_layer)
        t_draw.text((tx, ty), spaced_label, font=font, fill=(255, 255, 255, 255))
        
        img = Image.alpha_composite(img, glow_layer)
        img = Image.alpha_composite(img, text_layer)
        
    elif style_name == "frosted_capsule":
        # Concept 2: Sleek Borderless Frosted Glass Capsule
        pad_x = 22
        pad_y = 7
        cw = tw + pad_x * 2
        ch = th + pad_y * 2
        cx0 = (w - cw) // 2
        cy0 = int(h * 0.80)
        cx1 = cx0 + cw
        cy1 = cy0 + ch
        
        capsule_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        c_draw = ImageDraw.Draw(capsule_layer)
        # Deep translucent black, NO border
        c_draw.rounded_rectangle([cx0, cy0, cx1, cy1], radius=ch // 2, fill=(10, 10, 15, 175))
        
        text_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        t_draw = ImageDraw.Draw(text_layer)
        t_draw.text((cx0 + pad_x, cy0 + pad_y - 2), spaced_label, font=font, fill=(255, 255, 255, 245))
        
        img = Image.alpha_composite(img, capsule_layer)
        img = Image.alpha_composite(img, text_layer)
        
    elif style_name == "bottom_clean_bar":
        # Concept 3: Clean bottom minimal ribbon with smooth gradient
        gradient_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        g_draw = ImageDraw.Draw(gradient_layer)
        # Smooth dark gradient fade from y=380 to y=512
        for y in range(int(h * 0.72), h):
            alpha = int(210 * ((y - int(h * 0.72)) / (h - int(h * 0.72))))
            g_draw.line([(0, y), (w, y)], fill=(12, 12, 16, alpha))
            
        text_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        t_draw = ImageDraw.Draw(text_layer)
        tx = (w - tw) // 2
        ty = int(h * 0.82)
        t_draw.text((tx, ty), spaced_label, font=font, fill=(255, 255, 255, 255))
        
        img = Image.alpha_composite(img, gradient_layer)
        img = Image.alpha_composite(img, text_layer)
        
    out_path = f"/home/harsh/.gemini/antigravity-ide/brain/e0098be1-388f-4483-81c7-7509045eeccd/sample_{style_name}.png"
    img.convert("RGB").save(out_path, "PNG")
    print(f"Generated {out_path}")

create_sample("borderless_glow", "HDHUB4U")
create_sample("frosted_capsule", "HDHUB4U")
create_sample("bottom_clean_bar", "HDHUB4U")
