from PIL import Image

# Charger l'image
img = Image.open('public/dj.jpeg')

# Convertir en RGBA pour supporter la transparence
img = img.convert('RGBA')

# Récupérer les données
data = img.getdata()

# Créer une nouvelle liste de pixels
new_data = []
for item in data:
    # Si le pixel est gris clair (background), le rendre transparent
    # Gris clair: R~220, G~220, B~220
    if item[0] > 200 and item[1] > 200 and item[2] > 200:
        new_data.append((255, 255, 255, 0))  # Transparent
    else:
        new_data.append(item)

# Appliquer les changements
img.putdata(new_data)

# Sauvegarder en PNG (pour supporter la transparence)
img.save('public/dj.png', 'PNG')
print('Image sauvegardée: public/dj.png')
