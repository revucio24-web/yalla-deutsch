"""Build the reviewed, static lesson JSON used by the app.

Run with: python scripts/generate_content.py
The application reads only the generated JSON files; no content is generated at runtime.
"""
from __future__ import annotations

import json
from pathlib import Path


OUT = Path(__file__).resolve().parents[1] / "src" / "data"

WORLDS = [
    {"id": "home", "de": "Zuhause", "ar": "البيت والبداية", "subtitle": "Begrüßung, Wohnung und Alltag", "icon": "🏠", "color": "#2b9d95"},
    {"id": "market", "de": "Supermarkt", "ar": "السوق", "subtitle": "Einkaufen, Essen und Preise", "icon": "🛒", "color": "#efaa62"},
    {"id": "traffic", "de": "Unterwegs", "ar": "في الطريق", "subtitle": "Bus, Bahn und Orientierung", "icon": "🚌", "color": "#6b8fce"},
    {"id": "work", "de": "Arbeit", "ar": "العمل", "subtitle": "Beruf, Termine und Gespräche", "icon": "🧰", "color": "#9c83b9"},
    {"id": "health", "de": "Gesundheit", "ar": "الصحة", "subtitle": "Körper, Arzt und Apotheke", "icon": "🩺", "color": "#de807e"},
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
Automat|آلة التذاكر|der|🏧
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
    ("home", "Familie und Besuch", "العائلة والزيارة", """
Familie|العائلة|die|👨‍👩‍👧
Mutter|الأم|die|👩
Vater|الأب|der|👨
Kind|الطفل|das|🧒
Besuch|الزيارة|der|🎁
helfen|يساعد||🤝
"""),
    ("market", "Mengen und Preise", "الكميات والأسعار", """
Angebot|العرض|das|🏷️
Kilo|كيلوغرام|das|⚖️
Gramm|غرام|das|🧂
teuer|غالٍ||💎
billig|رخيص||🪙
bezahlen|يدفع||💳
"""),
    ("traffic", "Reise planen", "تخطيط الرحلة", """
Reiseziel|وجهة السفر|das|🎯
Rückfahrt|رحلة العودة|die|↩️
umsteigen|يبدّل وسيلة النقل||🔄
Verbindung|خط الرحلة|die|🔗
reservieren|يحجز||🎫
direkt|مباشر||➡️
"""),
    ("work", "Am Telefon", "على الهاتف", """
Anruf|المكالمة|der|📞
erreichbar|متاح للاتصال||📶
vereinbaren|يحدّد موعداً||📅
verschieben|يؤجّل||⏰
Rückmeldung|الرد|die|📨
zurückrufen|يعيد الاتصال||☎️
"""),
    ("health", "Gesund bleiben", "البقاء بصحة جيدة", """
Untersuchung|الفحص|die|🩺
Versicherungskarte|بطاقة التأمين|die|🪪
allergisch|مصاب بالحساسية||🤧
gesund|سليم||🍏
Behandlung|العلاج|die|🏥
Nebenwirkung|أثر جانبي|die|⚠️
"""),
    ("home", "In der Schule", "في المدرسة", """
Schule|مدرسة|die|🏫
Buch|كتاب|das|📘
Heft|دفتر|das|📓
Stift|قلم|der|✏️
lesen|يقرأ||📖
schreiben|يكتب||✍️
"""),
    ("market", "Im Restaurant", "في المطعم", """
Speisekarte|قائمة الطعام|die|📋
Suppe|حساء|die|🥣
Reis|أرز|der|🍚
bestellen|يطلب||🗣️
zahlen|يدفع||💶
Teller|طبق|der|🍽️
"""),
    ("traffic", "Mit dem Fahrrad", "بالدراجة", """
Helm|خوذة|der|⛑️
Radweg|مسار الدراجات|der|🚲
langsam|ببطء||🐢
sicher|بأمان||🛡️
links|يسار||⬅️
rechts|يمين||➡️
"""),
    ("work", "Mein Arbeitstag", "يوم عملي", """
Feierabend|نهاية الدوام|der|🌇
pünktlich|في الوقت المحدد||⏰
anfangen|يبدأ||▶️
Pause|استراحة|die|☕
fertig|منتهٍ||✅
arbeiten|يعمل||💼
"""),
    ("health", "Bewegung und Sport", "الحركة والرياضة", """
Sport|رياضة|der|🏅
Fußball|كرة القدم|der|⚽
schwimmen|يسبح||🏊
laufen|يركض||👟
spielen|يلعب||🎲
fit|لائق بدنيًا||💪
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
    ("Heute besucht uns meine Familie.", "تزورنا عائلتي اليوم.", "Meine ___ kommt heute zu Besuch.", "Familie", "Wann kommt deine Familie?", "متى تأتي عائلتك؟", "Sie kommt heute Abend."),
    ("Das Angebot kostet zwei Euro pro Kilo.", "العرض يكلف يوروين للكيلو.", "Das Produkt ist heute im ___.", "Angebot", "Wie möchten Sie bezahlen?", "كيف تريد أن تدفع؟", "Mit Karte, bitte."),
    ("Ich möchte eine direkte Verbindung reservieren.", "أريد حجز رحلة مباشرة.", "Muss ich in Köln ___?", "umsteigen", "Was ist Ihr Reiseziel?", "ما هي وجهة سفرك؟", "Mein Reiseziel ist Berlin."),
    ("Wir vereinbaren einen Anruf für Dienstag.", "نحدد مكالمة ليوم الثلاثاء.", "Können Sie mich später ___?", "zurückrufen", "Ist Frau Keller erreichbar?", "هل يمكن الوصول إلى السيدة كيلر؟", "Nein, ich bitte um eine Rückmeldung."),
    ("Die Untersuchung ist Teil der Behandlung.", "الفحص جزء من العلاج.", "Bitte bringen Sie Ihre ___ mit.", "Versicherungskarte", "Sind Sie gegen Penicillin allergisch?", "هل لديك حساسية من البنسلين؟", "Nein, ich bin nicht allergisch."),
    ("Ich lerne heute in der Schule.", "أتعلم اليوم في المدرسة.", "Ich lese ein ___.", "Buch", "Was liest du heute?", "ماذا تقرأ اليوم؟", "Ich lese ein Buch."),
    ("Ich bestelle eine Suppe und Reis.", "أطلب حساءً وأرزاً.", "Ich möchte eine ___, bitte.", "Suppe", "Was möchten Sie essen?", "ماذا تريد أن تأكل؟", "Eine Suppe mit Reis, bitte."),
    ("Ich fahre langsam auf dem Radweg.", "أقود ببطء في مسار الدراجات.", "Ich fahre auf dem ___.", "Radweg", "Fährst du gern Rad?", "هل تحب ركوب الدراجة؟", "Ja, aber ich trage einen Helm."),
    ("Wir fangen pünktlich um acht Uhr an.", "نبدأ في الساعة الثامنة في الوقت المحدد.", "Um vier Uhr ist ___.", "Feierabend", "Wann fängst du heute an?", "متى تبدأ اليوم؟", "Ich fange um acht Uhr an."),
    ("Am Nachmittag spiele ich Fußball.", "ألعب كرة القدم بعد الظهر.", "Im Sommer gehe ich gern ___.", "schwimmen", "Was machst du gern?", "ماذا تحب أن تفعل؟", "Ich spiele gern Fußball."),
]

LEGACY_OPTION_OVERRIDES = {
    "home-06": {
        "blank": ["Familie", "Verbindung", "Behandlung"],
        "dialogue": ["Sie kommt heute Abend.", "Sie fährt mit dem Kilo.", "Sie arbeitet im Rezept."],
    },
    "market-06": {
        "blank": ["Kilo", "Angebot", "Besuch"],
        "dialogue": ["Das ist sehr teuer.", "Mit Karte, bitte.", "Ein Gramm, bitte."],
    },
    "traffic-06": {
        "blank": ["bezahlen", "helfen", "umsteigen"],
        "dialogue": ["Mein Reiseziel ist Berlin.", "Die Familie ist billig.", "Ich bin allergisch."],
    },
    "work-06": {
        "blank": ["zurückrufen", "umsteigen", "bezahlen"],
        "dialogue": ["Das Angebot ist billig.", "Nein, ich bitte um eine Rückmeldung.", "Das Reiseziel ist dort."],
    },
    "health-06": {
        "blank": ["Rückfahrt", "Rückmeldung", "Versicherungskarte"],
        "dialogue": ["Nein, ich bin nicht allergisch.", "Ich möchte zwei Kilo.", "Bitte rufen Sie zurück."],
    },
}

ILLUSTRATIONS = {
    "home-03-03": "room", "home-04-01": "table", "home-04-02": "chair",
    "home-04-05": "wardrobe", "home-04-06": "lamp", "home-06-05": "visitor",
    "market-03-02": "bread-roll", "market-03-05": "flour", "market-04-06": "bottle",
    "market-05-02": "cash-register", "market-06-03": "gram", "market-06-06": "pay",
    "traffic-02-03": "platform", "traffic-02-05": "intersection", "traffic-03-03": "ticket-machine",
    "traffic-03-05": "departure", "traffic-03-06": "arrival", "traffic-04-02": "path",
    "traffic-04-04": "corner", "traffic-05-04": "driver", "traffic-05-05": "delay",
    "traffic-05-06": "transfer", "traffic-06-01": "destination", "traffic-06-05": "reserve",
    "work-04-01": "profession", "work-04-05": "interview", "work-06-04": "reschedule",
    "health-01-01": "head", "health-02-03": "abdomen", "health-02-04": "back",
    "health-03-06": "pharmacy", "health-04-01": "pain", "health-04-03": "cough",
    "health-05-01": "medicine", "health-05-02": "tablet", "health-06-03": "allergy",
    "health-06-04": "healthy",
}

WRONG_REPLIES = [
    "Gute Nacht.", "Das kostet drei Euro.", "Ich nehme den Bus.",
    "Ich habe Kopfschmerzen.", "Ich suche eine Wohnung.",
]


def rotate(options: list[str], shift: int) -> list[str]:
    """Move the correct answer away from a fixed slot so position 0 carries no signal."""
    offset = shift % len(options)
    return options[offset:] + options[:offset]


def build() -> None:
    if len(GROUPS) != 35 or len(EXAMPLES) != 35:
        raise ValueError("Expected exactly 35 authored missions")
    vocabulary: list[dict] = []
    lessons: list[dict] = []
    lesson_number_by_world: dict[str, int] = {}
    for index, ((world, title_de, title_ar, raw_words), example) in enumerate(zip(GROUPS, EXAMPLES, strict=True)):
        rows = [line.strip().split("|") for line in raw_words.strip().splitlines()]
        if len(rows) != 6 or any(len(row) != 4 for row in rows):
            raise ValueError(f"Mission {index + 1} needs six complete words")
        lesson_number = lesson_number_by_world.get(world, 0) + 1
        lesson_number_by_world[world] = lesson_number
        lesson_id = f"{world}-{lesson_number:02d}"
        word_ids = []
        for word_index, (german, arabic, article, icon) in enumerate(rows, start=1):
            word_id = f"{lesson_id}-{word_index:02d}"
            word_ids.append(word_id)
            word = {
                "id": word_id, "german": german, "arabic": arabic,
                "article": article or None, "icon": icon, "world": world,
            }
            if word_id in ILLUSTRATIONS:
                word["illustration"] = ILLUSTRATIONS[word_id]
            vocabulary.append(word)
        phrase, phrase_ar, blank_sentence, blank_answer, prompt, prompt_ar, reply = example
        distractors = [row[0] for row in rows if row[0] != blank_answer]
        if len(distractors) < 2:
            raise ValueError(f"Mission {lesson_id} needs two words that differ from the gap answer")
        wrong = [item for item in WRONG_REPLIES if item != reply][:2]
        if len(wrong) < 2:
            raise ValueError(f"Mission {lesson_id} needs two wrong replies")
        overrides = LEGACY_OPTION_OVERRIDES.get(lesson_id)
        blank_options = overrides["blank"] if overrides else rotate([blank_answer, *distractors[:2]], index)
        dialogue_options = overrides["dialogue"] if overrides else rotate([reply, *wrong], index + 1)
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
    if len(lesson_number_by_world) != len(WORLDS) or any(count != 7 for count in lesson_number_by_world.values()):
        raise ValueError("Expected seven missions for every world")
    if len(vocabulary) != 210 or len({word["id"] for word in vocabulary}) != 210:
        raise ValueError("Expected 210 unique vocabulary entries")
    OUT.mkdir(parents=True, exist_ok=True)
    for filename, data in (("worlds.json", WORLDS), ("vocabulary.json", vocabulary), ("lessons.json", lessons)):
        (OUT / filename).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(WORLDS)} worlds, {len(lessons)} lessons, {len(vocabulary)} words")


if __name__ == "__main__":
    build()
