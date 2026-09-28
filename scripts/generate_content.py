"""Build the reviewed, static lesson JSON used by the app.

Run with: python scripts/generate_content.py
The application reads only the generated JSON files; no content is generated at runtime.
"""
from __future__ import annotations

import json
from pathlib import Path


OUT = Path(__file__).resolve().parents[1] / "src" / "data"

WORLDS = [
    {"id": "home", "de": "Zuhause", "ar": "البيت والبداية", "subtitle": "Begrüßung, Wohnung und Alltag", "icon": "⌂", "color": "#2b9d95"},
    {"id": "market", "de": "Supermarkt", "ar": "السوق", "subtitle": "Einkaufen, Essen und Preise", "icon": "◧", "color": "#efaa62"},
    {"id": "traffic", "de": "Unterwegs", "ar": "في الطريق", "subtitle": "Bus, Bahn und Orientierung", "icon": "↗", "color": "#6b8fce"},
    {"id": "work", "de": "Arbeit", "ar": "العمل", "subtitle": "Beruf, Termine und Gespräche", "icon": "▣", "color": "#9c83b9"},
    {"id": "health", "de": "Gesundheit", "ar": "الصحة", "subtitle": "Körper, Arzt und Apotheke", "icon": "+", "color": "#de807e"},
]

# German | Arabic | article (empty for expressions) | visual symbol.
GROUPS = [
    ("home", "Hallo!", "التحية الأولى", """
Hallo|مرحباً||👋
Guten Morgen|صباح الخير||🌅
Guten Tag|نهارك سعيد||☀️
Guten Abend|مساء الخير||🌆
Tschüss|وداعاً||👋
Danke|شكراً||🙏
"""),
    ("home", "Mein Name", "التعارف", """
Name|اسم|der|✍️
Vorname|الاسم الأول|der|🪪
Nachname|اسم العائلة|der|🪪
Adresse|عنوان|die|📍
Stadt|مدينة|die|🏙️
Land|بلد|das|🌍
"""),
    ("home", "Meine Wohnung", "شقتي", """
Wohnung|شقة|die|🏠
Haus|بيت|das|🏡
Zimmer|غرفة|das|🚪
Tür|باب|die|🚪
Fenster|نافذة|das|🪟
Schlüssel|مفتاح|der|🔑
"""),
    ("home", "Möbel", "الأثاث", """
Tisch|طاولة|der|🪑
Stuhl|كرسي|der|🪑
Bett|سرير|das|🛏️
Sofa|أريكة|das|🛋️
Schrank|خزانة|der|🗄️
Lampe|مصباح|die|💡
"""),
    ("home", "Mein Tag", "يومي", """
Morgen|صباح|der|🌅
Abend|مساء|der|🌇
Tag|يوم|der|☀️
Nacht|ليل|die|🌙
Frühstück|فطور|das|🥐
Uhr|ساعة|die|🕒
"""),
    ("market", "Obst kaufen", "شراء الفاكهة", """
Apfel|تفاحة|der|🍎
Banane|موزة|die|🍌
Orange|برتقالة|die|🍊
Birne|كمثرى|die|🍐
Traube|حبة عنب|die|🍇
Erdbeere|فراولة|die|🍓
"""),
    ("market", "Gemüse", "الخضار", """
Tomate|طماطم|die|🍅
Kartoffel|بطاطا|die|🥔
Karotte|جزرة|die|🥕
Gurke|خيار|die|🥒
Zwiebel|بصلة|die|🧅
Salat|سلطة|der|🥗
"""),
    ("market", "In der Bäckerei", "في المخبز", """
Brot|خبز|das|🍞
Brötchen|خبزة صغيرة|das|🥖
Kuchen|كعكة|der|🍰
Keks|بسكويت|der|🍪
Mehl|طحين|das|🌾
Butter|زبدة|die|🧈
"""),
    ("market", "Getränke", "المشروبات", """
Wasser|ماء|das|💧
Milch|حليب|die|🥛
Kaffee|قهوة|der|☕
Tee|شاي|der|🫖
Saft|عصير|der|🧃
Flasche|زجاجة|die|🍾
"""),
    ("market", "An der Kasse", "عند صندوق الدفع", """
Preis|سعر|der|🏷️
Kasse|صندوق الدفع|die|🧾
Euro|يورو|der|💶
Geld|مال|das|💰
Tüte|كيس|die|🛍️
Quittung|إيصال|die|🧾
"""),
    ("traffic", "Verkehrsmittel", "وسائل النقل", """
Bus|حافلة|der|🚌
Bahn|قطار محلي|die|🚈
Zug|قطار|der|🚆
Fahrrad|دراجة|das|🚲
Auto|سيارة|das|🚗
Taxi|سيارة أجرة|das|🚕
"""),
    ("traffic", "Am Bahnhof", "في المحطة", """
Bahnhof|محطة القطار|der|🚉
Haltestelle|موقف|die|🚏
Gleis|رصيف القطار|das|🚆
Straße|شارع|die|🛣️
Kreuzung|تقاطع|die|➕
Ampel|إشارة المرور|die|🚦
"""),
    ("traffic", "Fahrkarte", "تذكرة السفر", """
Ticket|تذكرة|das|🎫
Fahrkarte|تذكرة سفر|die|🎟️
Automat|آلة البيع|der|🏧
Fahrplan|جدول الرحلات|der|🗓️
Abfahrt|مغادرة|die|↗️
Ankunft|وصول|die|↘️
"""),
    ("traffic", "Den Weg finden", "معرفة الطريق", """
Karte|خريطة|die|🗺️
Weg|طريق|der|🛤️
Richtung|اتجاه|die|🧭
Ecke|زاوية|die|↪️
Brücke|جسر|die|🌉
Ausgang|مخرج|der|🚪
"""),
    ("traffic", "Pünktlich sein", "الوصول في الوقت", """
Minute|دقيقة|die|⏱️
Stunde|ساعة|die|🕐
Fahrgast|راكب|der|🧍
Fahrer|سائق|der|🧑‍✈️
Verspätung|تأخير|die|⌛
Anschluss|وصلة نقل|der|🔄
"""),
    ("work", "Mein Arbeitsplatz", "مكان عملي", """
Arbeit|عمل|die|💼
Büro|مكتب|das|🏢
Firma|شركة|die|🏬
Arbeitsplatz|مكان العمل|der|🖥️
Chef|مدير|der|👨‍💼
Kollegin|زميلة|die|👩‍💼
"""),
    ("work", "Im Büro", "في المكتب", """
Computer|حاسوب|der|💻
Bildschirm|شاشة|der|🖥️
Tastatur|لوحة مفاتيح|die|⌨️
Maus|فأرة الحاسوب|die|🖱️
Telefon|هاتف|das|☎️
E-Mail|بريد إلكتروني|die|✉️
"""),
    ("work", "Zeit und Termine", "الوقت والمواعيد", """
Termin|موعد|der|📅
Pause|استراحة|die|☕
Schicht|وردية عمل|die|🕗
Woche|أسبوع|die|🗓️
Monat|شهر|der|📆
Kalender|تقويم|der|🗓️
"""),
    ("work", "Eine Stelle suchen", "البحث عن وظيفة", """
Beruf|مهنة|der|🧑‍🔧
Bewerbung|طلب توظيف|die|📄
Lebenslauf|سيرة ذاتية|der|📃
Stelle|وظيفة|die|💼
Vorstellungsgespräch|مقابلة عمل|das|🤝
Vertrag|عقد|der|📝
"""),
    ("work", "Zusammen arbeiten", "العمل معاً", """
Besprechung|اجتماع|die|🗣️
Frage|سؤال|die|❓
Antwort|جواب|die|💬
Aufgabe|مهمة|die|📋
Projekt|مشروع|das|🗂️
Nachricht|رسالة|die|✉️
"""),
    ("health", "Mein Kopf", "رأسي", """
Kopf|رأس|der|🧑
Auge|عين|das|👁️
Ohr|أذن|das|👂
Nase|أنف|die|👃
Mund|فم|der|👄
Hand|يد|die|✋
"""),
    ("health", "Mein Körper", "جسمي", """
Arm|ذراع|der|💪
Bein|ساق|das|🦵
Bauch|بطن|der|🧍
Rücken|ظهر|der|🧍
Fuß|قدم|der|🦶
Herz|قلب|das|❤️
"""),
    ("health", "Beim Arzt", "عند الطبيب", """
Arzt|طبيب|der|🧑‍⚕️
Ärztin|طبيبة|die|👩‍⚕️
Praxis|عيادة|die|🏥
Termin|موعد|der|📅
Rezept|وصفة طبية|das|📄
Apotheke|صيدلية|die|⚕️
"""),
    ("health", "Wie geht es dir?", "كيف حالك؟", """
Schmerz|ألم|der|🤕
Fieber|حمّى|das|🌡️
Husten|سعال|der|😷
Schnupfen|زكام|der|🤧
Übelkeit|غثيان|die|🤢
Müdigkeit|تعب|die|😴
"""),
    ("health", "In der Apotheke", "في الصيدلية", """
Medikament|دواء|das|💊
Tablette|حبّة دواء|die|💊
Wasser|ماء|das|💧
Ruhe|راحة|die|🛏️
Hilfe|مساعدة|die|🆘
Notruf|اتصال طوارئ|der|☎️
"""),
]

# Sentence building, gap filling, and dialogue content is authored per mission.
EXAMPLES = [
    ("Guten Morgen, ich heiße Sami.", "صباح الخير، اسمي سامي.", "___ Morgen!", "Guten", "Wie heißen Sie?", "ما اسمك؟", "Ich heiße Sami."),
    ("Mein Name ist Lina.", "اسمي لينا.", "Mein ___ ist Lina.", "Name", "Woher kommen Sie?", "من أين أنت؟", "Ich komme aus Syrien."),
    ("Das ist meine Wohnung.", "هذه شقتي.", "Das ist meine ___.", "Wohnung", "Haben Sie einen Schlüssel?", "هل لديك مفتاح؟", "Ja, hier ist er."),
    ("Der Tisch steht im Zimmer.", "الطاولة في الغرفة.", "Der ___ steht im Zimmer.", "Tisch", "Wo ist das Bett?", "أين السرير؟", "Im Schlafzimmer."),
    ("Wir frühstücken am Morgen.", "نتناول الفطور صباحاً.", "Wir frühstücken am ___.", "Morgen", "Wie spät ist es?", "كم الساعة؟", "Es ist acht Uhr."),
    ("Ich möchte zwei Äpfel.", "أريد تفاحتين.", "Ich möchte zwei ___.", "Äpfel", "Was möchten Sie?", "ماذا تريد؟", "Zwei Äpfel, bitte."),
    ("Die Tomate ist frisch.", "الطماطم طازجة.", "Die ___ ist frisch.", "Tomate", "Haben Sie Kartoffeln?", "هل لديكم بطاطا؟", "Ja, dort drüben."),
    ("Das Brot kostet drei Euro.", "الخبز يكلف ثلاثة يورو.", "Das ___ kostet drei Euro.", "Brot", "Was kostet das Brot?", "كم سعر الخبز؟", "Drei Euro."),
    ("Ich trinke ein Glas Wasser.", "أشرب كوب ماء.", "Ich trinke ein Glas ___.", "Wasser", "Möchten Sie etwas trinken?", "هل تريد شيئاً للشرب؟", "Ja, Wasser, bitte."),
    ("Wo ist die Kasse?", "أين صندوق الدفع؟", "Wo ist die ___?", "Kasse", "Brauchen Sie eine Tüte?", "هل تحتاج إلى كيس؟", "Ja, bitte."),
    ("Ich fahre mit dem Bus.", "أذهب بالحافلة.", "Ich fahre mit dem ___.", "Bus", "Fahren Sie mit dem Bus?", "هل تذهب بالحافلة؟", "Ja, zum Bahnhof."),
    ("Der Bahnhof ist dort.", "محطة القطار هناك.", "Der ___ ist dort.", "Bahnhof", "Wo ist die Haltestelle?", "أين الموقف؟", "Dort an der Straße."),
    ("Ich brauche ein Ticket.", "أحتاج إلى تذكرة.", "Ich brauche ein ___.", "Ticket", "Haben Sie eine Fahrkarte?", "هل لديك تذكرة سفر؟", "Ja, hier ist sie."),
    ("Gehen Sie zur Ampel.", "اذهب إلى إشارة المرور.", "Gehen Sie zur ___.", "Ampel", "Wo ist der Ausgang?", "أين المخرج؟", "Geradeaus und dann links."),
    ("Der Zug hat Verspätung.", "القطار متأخر.", "Der Zug hat ___.", "Verspätung", "Wann fährt der Zug?", "متى ينطلق القطار؟", "In zehn Minuten."),
    ("Ich arbeite im Büro.", "أعمل في المكتب.", "Ich arbeite im ___.", "Büro", "Wo arbeiten Sie?", "أين تعمل؟", "In einem Büro."),
    ("Ich schreibe eine E-Mail.", "أكتب بريداً إلكترونياً.", "Ich schreibe eine ___.", "E-Mail", "Ist der Computer frei?", "هل الحاسوب متاح؟", "Ja, bitte."),
    ("Der Termin ist am Montag.", "الموعد يوم الاثنين.", "Der ___ ist am Montag.", "Termin", "Wann haben wir Pause?", "متى الاستراحة؟", "Um zwölf Uhr."),
    ("Ich habe einen Lebenslauf.", "لدي سيرة ذاتية.", "Ich habe einen ___.", "Lebenslauf", "Suchen Sie eine Stelle?", "هل تبحث عن وظيفة؟", "Ja, ich bewerbe mich."),
    ("Ich habe eine Frage zum Projekt.", "لدي سؤال عن المشروع.", "Ich habe eine ___ zum Projekt.", "Frage", "Haben Sie die Aufgabe verstanden?", "هل فهمت المهمة؟", "Ja, danke."),
    ("Mein Kopf tut weh.", "رأسي يؤلمني.", "Mein ___ tut weh.", "Kopf", "Wo tut es weh?", "أين يؤلمك؟", "Am Kopf."),
    ("Mein Bauch tut weh.", "بطني يؤلمني.", "Mein ___ tut weh.", "Bauch", "Wo haben Sie Schmerzen?", "أين تشعر بالألم؟", "Im Bauch."),
    ("Ich brauche einen Termin beim Arzt.", "أحتاج إلى موعد عند الطبيب.", "Ich brauche einen ___ beim Arzt.", "Termin", "Haben Sie einen Termin?", "هل لديك موعد؟", "Ja, um zehn Uhr."),
    ("Ich habe Fieber und Husten.", "لدي حمّى وسعال.", "Ich habe ___ und Husten.", "Fieber", "Was fehlt Ihnen?", "ما الذي تعاني منه؟", "Ich habe Fieber."),
    ("Ich brauche ein Medikament.", "أحتاج إلى دواء.", "Ich brauche ein ___.", "Medikament", "Brauchen Sie Hilfe?", "هل تحتاج إلى مساعدة؟", "Ja, bitte."),
]

WRONG_REPLIES = [
    "Gute Nacht.", "Das kostet drei Euro.", "Ich nehme den Bus.",
    "Ich habe Kopfschmerzen.", "Ich suche eine Wohnung.",
]


def rotate(options: list[str], shift: int) -> list[str]:
    """Move the correct answer away from a fixed slot so position 0 carries no signal."""
    offset = shift % len(options)
    return options[offset:] + options[:offset]


def build() -> None:
    if len(GROUPS) != 25 or len(EXAMPLES) != 25:
        raise ValueError("Expected exactly 25 authored missions")
    vocabulary: list[dict] = []
    lessons: list[dict] = []
    for index, ((world, title_de, title_ar, raw_words), example) in enumerate(zip(GROUPS, EXAMPLES, strict=True)):
        rows = [line.strip().split("|") for line in raw_words.strip().splitlines()]
        if len(rows) != 6 or any(len(row) != 4 for row in rows):
            raise ValueError(f"Mission {index + 1} needs six complete words")
        lesson_id = f"{world}-{index % 5 + 1:02d}"
        word_ids = []
        for word_index, (german, arabic, article, icon) in enumerate(rows, start=1):
            word_id = f"{lesson_id}-{word_index:02d}"
            word_ids.append(word_id)
            vocabulary.append({
                "id": word_id, "german": german, "arabic": arabic,
                "article": article or None, "icon": icon, "world": world,
            })
        phrase, phrase_ar, blank_sentence, blank_answer, prompt, prompt_ar, reply = example
        distractors = [row[0] for row in rows if row[0] != blank_answer]
        if len(distractors) < 2:
            raise ValueError(f"Mission {lesson_id} needs two words that differ from the gap answer")
        wrong = [item for item in WRONG_REPLIES if item != reply][:2]
        if len(wrong) < 2:
            raise ValueError(f"Mission {lesson_id} needs two wrong replies")
        blank_options = rotate([blank_answer, *distractors[:2]], index)
        dialogue_options = rotate([reply, *wrong], index + 1)
        if len(set(blank_options)) != 3 or len(set(dialogue_options)) != 3:
            raise ValueError(f"Mission {lesson_id} produced duplicate answer options")
        lessons.append({
            "id": lesson_id, "world": world, "order": index,
            "titleDe": title_de, "titleAr": title_ar, "wordIds": word_ids,
            "phrase": {"german": phrase, "arabic": phrase_ar},
            "blank": {"sentence": blank_sentence, "answer": blank_answer,
                      "options": blank_options},
            "dialogue": {"prompt": prompt, "promptAr": prompt_ar,
                         "answer": reply, "options": dialogue_options},
        })
    if len(vocabulary) != 150 or len({word["id"] for word in vocabulary}) != 150:
        raise ValueError("Expected 150 unique vocabulary entries")
    OUT.mkdir(parents=True, exist_ok=True)
    for filename, data in (("worlds.json", WORLDS), ("vocabulary.json", vocabulary), ("lessons.json", lessons)):
        (OUT / filename).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(WORLDS)} worlds, {len(lessons)} lessons, {len(vocabulary)} words")


if __name__ == "__main__":
    build()
