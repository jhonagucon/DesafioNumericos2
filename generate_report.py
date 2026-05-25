import os
import sys
import subprocess

# Ensure reportlab is installed
try:
    import reportlab
except ImportError:
    print("ReportLab is not installed. Attempting to install...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "reportlab"])
    import reportlab

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
from reportlab.pdfgen import canvas

# NumberedCanvas pattern to calculate total pages dynamically and draw headers/footers
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_elements(num_pages)
            super().showPage()
        super().save()

    def draw_page_elements(self, page_count):
        self.saveState()
        
        # Color definitions
        primary_color = colors.HexColor("#0f766e") # Dark Teal
        secondary_color = colors.HexColor("#1e293b") # Dark Slate
        accent_teal = colors.HexColor("#0d9488")
        light_slate = colors.HexColor("#64748b")
        
        # Cover Page
        if self._pageNumber == 1:
            # Main teal background block (top half)
            self.setFillColor(primary_color)
            self.rect(0, 480, 612, 312, stroke=0, fill=1)
            
            # Slate line under the main block
            self.setFillColor(secondary_color)
            self.rect(0, 460, 612, 20, stroke=0, fill=1)
            
            # Draw decorative circles or patterns in white/teal on cover
            self.setFillColor(colors.HexColor("#14b8a6"))
            self.circle(550, 700, 100, stroke=0, fill=1)
            self.setFillColor(primary_color)
            self.circle(550, 700, 80, stroke=0, fill=1)
            
            # White text in the teal block
            self.setFillColor(colors.white)
            self.setFont("Helvetica-Bold", 24)
            self.drawString(54, 690, "BIOMECÁNICA MATEMÁTICA")
            self.setFont("Helvetica", 14)
            self.drawString(54, 665, "Simulación y Análisis del Ciclo de Vuelo")
            
            self.setFont("Helvetica-Oblique", 16)
            self.drawString(54, 620, "Alkamari Andino (Vanellus resplendens)")
            
            # Dark text below the teal block
            self.setFillColor(secondary_color)
            self.setFont("Helvetica-Bold", 13)
            self.drawString(54, 400, "INFORME TÉCNICO Y ESPECIFICACIONES DE DISEÑO")
            self.setFont("Helvetica", 11)
            self.drawString(54, 380, "Modelación Computacional mediante Splines y Transformada de Fourier")
            self.drawString(54, 362, "Desafío Final — Aves Andinas, La Paz, Bolivia")
            
            # Decorative abstract wing representation (vector path)
            p = self.beginPath()
            p.moveTo(54, 300)
            p.curveTo(150, 350, 250, 310, 350, 260)
            p.curveTo(250, 240, 150, 260, 54, 300)
            self.setFillColor(colors.HexColor("#f1f5f9"))
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.drawPath(p, fill=1, stroke=1)
            
            # Metadata block at bottom
            self.setFillColor(secondary_color)
            self.setFont("Helvetica-Bold", 10)
            self.drawString(54, 180, "INSTITUCIÓN:")
            self.setFont("Helvetica", 10)
            self.drawString(150, 180, "Universidad Mayor de San Andrés (UMSA)")
            self.drawString(150, 166, "Facultad de Ciencias Puras y Naturales - Carrera de Matemática")
            
            self.setFont("Helvetica-Bold", 10)
            self.drawString(54, 136, "UBICACIÓN:")
            self.setFont("Helvetica", 10)
            self.drawString(150, 136, "La Paz, Bolivia")
            
            self.setFont("Helvetica-Bold", 10)
            self.drawString(54, 106, "AUTOR:")
            self.setFont("Helvetica", 10)
            self.drawString(150, 106, "Desafío Final - Biomecánica Matemática de las Aves Paceñas")
            
            self.setFont("Helvetica-Bold", 10)
            self.drawString(54, 76, "FECHA:")
            self.setFont("Helvetica", 10)
            self.drawString(150, 76, "Mayo de 2026")
            
        else:
            # Running Header
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(primary_color)
            self.drawString(54, 755, "BIOMECÁNICA MATEMÁTICA DEL ALKAMARI ANDINO")
            self.setFont("Helvetica", 8)
            self.setFillColor(light_slate)
            self.drawRightString(558, 755, "Informe Técnico")
            
            # Header line
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.75)
            self.line(54, 747, 558, 747)
            
            # Running Footer
            self.line(54, 48, 558, 48)
            self.drawString(54, 34, "Universidad Mayor de San Andrés")
            self.drawCentredString(306, 34, "La Paz, Bolivia")
            page_text = f"Página {self._pageNumber} de {page_count}"
            self.drawRightString(558, 34, page_text)
            
        self.restoreState()

def build_pdf(filename="informe_biomecanica_alkamari.pdf"):
    # Target page width = 612, height = 792 (Letter)
    # Margins: left/right=54, top=72 (leaves 720pt for content), bottom=72 (leaves 720pt for content)
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=68,
        bottomMargin=68
    )
    
    # Color scheme
    primary_color = colors.HexColor("#0f766e")    # Dark Teal
    secondary_color = colors.HexColor("#1e293b")  # Dark Slate
    text_color = colors.HexColor("#334155")       # Charcoal
    accent_teal = colors.HexColor("#0d9488")
    bg_light = colors.HexColor("#f8fafc")
    border_color = colors.HexColor("#e2e8f0")
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    styles['Normal'].textColor = text_color
    styles['Normal'].fontSize = 10
    styles['Normal'].leading = 14
    styles['Normal'].alignment = TA_JUSTIFY
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=secondary_color,
        spaceAfter=15,
        alignment=TA_LEFT
    )
    
    h1_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'SubSectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13,
        textColor=secondary_color,
        spaceBefore=8,
        spaceAfter=5,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        spaceBefore=4,
        spaceAfter=4
    )
    
    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=styles['Normal'],
        leftIndent=15,
        bulletIndent=5,
        spaceBefore=2,
        spaceAfter=2
    )
    
    equation_style = ParagraphStyle(
        'EquationStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0f766e"),
        backColor=colors.HexColor("#f1f5f9"),
        borderColor=colors.HexColor("#cbd5e1"),
        borderWidth=0.5,
        borderPadding=6,
        spaceBefore=6,
        spaceAfter=6,
        alignment=TA_CENTER
    )
    
    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1e293b"),
        backColor=colors.HexColor("#f8fafc"),
        borderColor=colors.HexColor("#cbd5e1"),
        borderWidth=0.5,
        borderPadding=5,
        spaceBefore=4,
        spaceAfter=4
    )
    
    table_text_style = ParagraphStyle(
        'TableText',
        parent=styles['Normal'],
        fontSize=9,
        leading=11,
        alignment=TA_LEFT
    )
    
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white,
        alignment=TA_LEFT
    )
    
    story = []
    
    # ----------------------------------------------------
    # PAGE 1: COVER PAGE
    # ----------------------------------------------------
    story.append(PageBreak()) # Cover page is drawn directly on canvas, we break to page 2 immediately
    
    # ----------------------------------------------------
    # PAGE 2: TABLE OF CONTENTS & INTRODUCTION
    # ----------------------------------------------------
    story.append(Paragraph("Índice General", title_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=2, spaceAfter=10))
    
    toc_data = [
        [Paragraph("<b>1. Descripción General</b>", body_style), Paragraph(". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .", body_style), Paragraph("<b>2</b>", ParagraphStyle('R', parent=body_style, alignment=TA_RIGHT))],
        [Paragraph("<b>2. Arquitectura del Proyecto</b>", body_style), Paragraph(". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .", body_style), Paragraph("<b>2</b>", ParagraphStyle('R', parent=body_style, alignment=TA_RIGHT))],
        [Paragraph("<b>3. Fundamentos Matemáticos: Splines Cúbicos</b>", body_style), Paragraph(". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .", body_style), Paragraph("<b>3</b>", ParagraphStyle('R', parent=body_style, alignment=TA_RIGHT))],
        [Paragraph("<b>4. Análisis de Frecuencia de Fourier</b>", body_style), Paragraph(". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .", body_style), Paragraph("<b>4</b>", ParagraphStyle('R', parent=body_style, alignment=TA_RIGHT))],
        [Paragraph("<b>5. Simulación Cinemática y Perfil Alar</b>", body_style), Paragraph(". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .", body_style), Paragraph("<b>5</b>", ParagraphStyle('R', parent=body_style, alignment=TA_RIGHT))],
        [Paragraph("<b>6. Captura de Datos y Telemetría</b>", body_style), Paragraph(". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .", body_style), Paragraph("<b>6</b>", ParagraphStyle('R', parent=body_style, alignment=TA_RIGHT))],
        [Paragraph("<b>7. Backend en Python y API REST</b>", body_style), Paragraph(". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .", body_style), Paragraph("<b>6</b>", ParagraphStyle('R', parent=body_style, alignment=TA_RIGHT))],
        [Paragraph("<b>8. Interfaz de Usuario y Controles</b>", body_style), Paragraph(". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .", body_style), Paragraph("<b>7</b>", ParagraphStyle('R', parent=body_style, alignment=TA_RIGHT))],
        [Paragraph("<b>9. Ficha de Datos Biológicos</b>", body_style), Paragraph(". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .", body_style), Paragraph("<b>7</b>", ParagraphStyle('R', parent=body_style, alignment=TA_RIGHT))],
        [Paragraph("<b>10. Referencias y Conclusión</b>", body_style), Paragraph(". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .", body_style), Paragraph("<b>8</b>", ParagraphStyle('R', parent=body_style, alignment=TA_RIGHT))]
    ]
    toc_table = Table(toc_data, colWidths=[200, 270, 34])
    toc_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('TOPPADDING', (0,0), (-1,-1), 1),
    ]))
    story.append(toc_table)
    story.append(Spacer(1, 15))
    
    story.append(Paragraph("1. Descripción General", h1_style))
    story.append(Paragraph(
        "El presente informe detalla la simulación digital y el modelado matemático del ciclo de vuelo del "
        "<b>Alkamari Andino</b> (<i>Vanellus resplendens</i>), una especie de ave representativa de la región altoandina "
        "y el altiplano paceño de Bolivia. El objetivo central de este proyecto es transformar las observaciones "
        "biomecánicas de campo en una simulación fluida, cinemáticamente coherente y validada matemáticamente. Para ello, "
        "se integran dos pilares de las matemáticas aplicadas y el análisis de señales: los <b>Splines Cúbicos Naturales</b> "
        "para la interpolación espacial del ala, y el <b>Análisis de Frecuencia de Fourier</b> para la decodificación del ciclo "
        "angular de aleteo.",
        body_style
    ))
    story.append(Paragraph(
        "A través de este modelado, es posible estudiar detalladamente los parámetros dinámicos del vuelo (como posición, velocidad "
        "y aceleración angular) y validarlos contra la literatura biológica disponible. El sistema desarrollado ofrece tanto un motor "
        "de cálculo en el navegador (JavaScript) como una API de alto rendimiento en Python, garantizando precisión teórica y un "
        "renderizado interactivo visualmente de alta calidad.",
        body_style
    ))
    story.append(Spacer(1, 10))
    
    # ----------------------------------------------------
    # ARCHITECTURE
    # ----------------------------------------------------
    story.append(Paragraph("2. Arquitectura del Proyecto", h1_style))
    story.append(Paragraph(
        "El sistema consta de una arquitectura acoplada pero modular, permitiendo tanto el funcionamiento puramente "
        "en cliente (Frontend en HTML5/CSS3/JavaScript) como un soporte de cálculo avanzado mediante un servidor "
        "backend en Python (Flask/SciPy/NumPy).",
        body_style
    ))
    
    arch_data = [
        [Paragraph("<b>Componente</b>", table_header_style), Paragraph("<b>Archivo</b>", table_header_style), Paragraph("<b>Rol Técnico en el Sistema</b>", table_header_style)],
        [Paragraph("Estructura", table_text_style), Paragraph("index.html", code_style), Paragraph("Define la interfaz de 3 columnas, paneles de control, contenedor Canvas 2D y el visualizador de datos capturados.", table_text_style)],
        [Paragraph("Estilos", table_text_style), Paragraph("index.css", code_style), Paragraph("Sistema de diseño dark mode con tokens CSS modernos, transiciones y layouts responsivos.", table_text_style)],
        [Paragraph("Motor Splines", table_text_style), Paragraph("spline.js", code_style), Paragraph("Implementación pura en JS del resolvedor de sistemas tridiagonales para interpolación cúbica natural.", table_text_style)],
        [Paragraph("Motor Fourier", table_text_style), Paragraph("fourier.js", code_style), Paragraph("Algoritmo DFT y FFT optimizado O(N log N) en JS para detectar la frecuencia fundamental de aleteo.", table_text_style)],
        [Paragraph("Simulador", table_text_style), Paragraph("simulation.js", code_style), Paragraph("Dibuja el Alkamari Andino en un contexto Canvas 2D, aplicando la cinemática de aleteo, estelas de viento y plumaje dinámico.", table_text_style)],
        [Paragraph("Orquestador", table_text_style), Paragraph("app.js", code_style), Paragraph("Gestiona el bucle de animación, sincroniza los motores matemáticos con los controles de la UI y gestiona la telemetría.", table_text_style)],
        [Paragraph("Backend", table_text_style), Paragraph("server.py", code_style), Paragraph("Servidor HTTP Flask en Python que expone servicios para el cálculo redundante y de alta precisión con NumPy y SciPy.", table_text_style)]
    ]
    arch_table = Table(arch_data, colWidths=[80, 90, 334])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
    ]))
    story.append(arch_table)
    story.append(PageBreak())
    
    # ----------------------------------------------------
    # PAGE 3: MATHEMATICAL FUNDAMENTALS
    # ----------------------------------------------------
    story.append(Paragraph("3. Fundamentos Matemáticos: Splines Cúbicos", title_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=2, spaceAfter=10))
    
    story.append(Paragraph(
        "Para simular la forma del ala en movimiento sin quiebres visuales, se utiliza la interpolación por "
        "<b>Splines Cúbicos Naturales</b>. Dado un conjunto de <i>n</i> puntos de control que definen el perfil alar, "
        "denotados por (x₀, y₀), (x₁, y₁), ..., (x<sub>n-1</sub>, y<sub>n-1</sub>), se construyen <i>n-1</i> polinomios de tercer grado "
        "S<sub>i</sub>(x) en cada subintervalo [x<sub>i</sub>, x<sub>i+1</sub>] para i = 0, 1, ..., n-2:",
        body_style
    ))
    
    story.append(Paragraph(
        "S<sub>i</sub>(x) = a<sub>i</sub> + b<sub>i</sub>(x - x<sub>i</sub>) + c<sub>i</sub>(x - x<sub>i</sub>)<sup>2</sup> + d<sub>i</sub>(x - x<sub>i</sub>)<sup>3</sup>",
        equation_style
    ))
    
    story.append(Paragraph(
        "Los coeficientes de cada polinomio cúbico se determinan garantizando la suavidad en las uniones "
        "interiores. Esto se formaliza mediante la imposición de continuidad en la función, su primera derivada (velocidad) "
        "y su segunda derivada (aceleración). Adicionalmente, se imponen condiciones en las fronteras extremas (Bordes Naturales).",
        body_style
    ))
    
    cond_data = [
        [Paragraph("<b>Condición</b>", table_header_style), Paragraph("<b>Ecuación Matemática</b>", table_header_style), Paragraph("<b>Significado Físico / Geométrico</b>", table_header_style)],
        [Paragraph("Continuidad C⁰", table_text_style), Paragraph("S<sub>i</sub>(x<sub>i+1</sub>) = S<sub>i+1</sub>(x<sub>i+1</sub>) = y<sub>i+1</sub>", code_style), Paragraph("Las curvas se conectan físicamente en cada punto de control. No hay saltos.", table_text_style)],
        [Paragraph("Continuidad C¹", table_text_style), Paragraph("S'<sub>i</sub>(x<sub>i+1</sub>) = S'<sub>i+1</sub>(x<sub>i+1</sub>)", code_style), Paragraph("La pendiente (velocidad local) es idéntica en el punto de contacto. Curva suave.", table_text_style)],
        [Paragraph("Continuidad C²", table_text_style), Paragraph("S''<sub>i</sub>(x<sub>i+1</sub>) = S''<sub>i+1</sub>(x<sub>i+1</sub>)", code_style), Paragraph("La curvatura (aceleración local) es continua en el punto de contacto.", table_text_style)],
        [Paragraph("Borde Natural", table_text_style), Paragraph("S''(x₀) = 0 ,&nbsp;&nbsp; S''(x<sub>n-1</sub>) = 0", code_style), Paragraph("La curvatura se anula en los extremos del ala, simulando puntas relajadas libres.", table_text_style)]
    ]
    cond_table = Table(cond_data, colWidths=[90, 204, 210])
    cond_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
    ]))
    story.append(cond_table)
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("Construcción del Sistema Tridiagonal", h2_style))
    story.append(Paragraph(
        "Al definir h<sub>i</sub> = x<sub>i+1</sub> - x<sub>i</sub> como el paso espacial en el eje X, e igualar las derivadas "
        "segundas en los nodos, se obtiene un sistema lineal acoplado para las segundas derivadas c<sub>i</sub>. "
        "El sistema tridiagonal resultante para los coeficientes c<sub>i</sub> (para i = 1, 2, ..., n-2) se expresa como:",
        body_style
    ))
    
    story.append(Paragraph(
        "h<sub>i-1</sub> c<sub>i-1</sub> + 2(h<sub>i-1</sub> + h<sub>i</sub>) c<sub>i</sub> + h<sub>i</sub> c<sub>i+1</sub> = "
        "3 [ (y<sub>i+1</sub> - y<sub>i</sub>)/h<sub>i</sub>  -  (y<sub>i</sub> - y<sub>i-1</sub>)/h<sub>i-1</sub> ]",
        equation_style
    ))
    
    story.append(Paragraph(
        "Dado que c₀ = 0 y c<sub>n-1</sub> = 0 por la condición de borde natural, el sistema se reduce a n-2 ecuaciones lineales "
        "con estructura tridiagonal estrictamente dominante por diagonal. Esto garantiza la existencia y unicidad de la solución, "
        "permitiendo resolver el sistema en tiempo de O(n) mediante el <b>Algoritmo de Thomas</b> (eliminación hacia adelante y "
        "sustitución hacia atrás). En el proyecto, este solucionador está programado nativamente tanto en <i>spline.js</i> como "
        "en el backend con <i>scipy.interpolate.CubicSpline</i>.",
        body_style
    ))
    
    # Coeficientes
    story.append(Paragraph("Cálculo de los Coeficientes Secundarios", h2_style))
    story.append(Paragraph(
        "Una vez resueltos los coeficientes c<sub>i</sub>, los coeficientes a<sub>i</sub>, b<sub>i</sub> y d<sub>i</sub> para cada segmento "
        "se calculan directamente a partir de las relaciones geométricas de continuidad:",
        body_style
    ))
    
    story.append(Paragraph(
        "a<sub>i</sub> = y<sub>i</sub><br/>"
        "b<sub>i</sub> = (y<sub>i+1</sub> - y<sub>i</sub>)/h<sub>i</sub> - h<sub>i</sub>(2c<sub>i</sub> + c<sub>i+1</sub>)/3<br/>"
        "d<sub>i</sub> = (c<sub>i+1</sub> - c<sub>i</sub>)/(3h<sub>i</sub>)",
        equation_style
    ))
    story.append(PageBreak())
    
    # ----------------------------------------------------
    # PAGE 4: FOURIER ANALYSIS
    # ----------------------------------------------------
    story.append(Paragraph("4. Análisis de Frecuencia de Fourier", title_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=2, spaceAfter=10))
    
    story.append(Paragraph(
        "La biomecánica del vuelo del Alkamari Andino genera una señal de oscilación angular periódica. Para decodificar "
        "esta señal en tiempo real y validar que la frecuencia de aleteo simulada es fiel al modelo, se implementa un "
        "motor de análisis espectral basado en la <b>Transformada Discreta de Fourier (DFT)</b>.",
        body_style
    ))
    
    story.append(Paragraph(
        "La DFT toma N muestras de la señal angular x[n] y las proyecta en el dominio de la frecuencia:",
        body_style
    ))
    
    story.append(Paragraph(
        "X[k] = &Sigma;<sub>(n=0 &rarr; N-1)</sub> x[n] &middot; e<sup>-j 2&pi; k n / N</sup>",
        equation_style
    ))
    
    story.append(Paragraph(
        "Donde X[k] es un número complejo que codifica la amplitud y la fase del k-ésimo componente de frecuencia. Para optimizar el "
        "cálculo en tiempo real, el archivo <i>fourier.js</i> y el backend en <i>server.py</i> utilizan el algoritmo de la "
        "<b>Transformada Rápida de Fourier (FFT)</b> (Cooley-Tukey, Radix-2) que reduce la complejidad matemática de "
        "O(N²) a O(N log N). Para que este algoritmo funcione eficientemente, la señal de telemetría de entrada se rellena "
        "con ceros (Zero-Padding) hasta la potencia de 2 más cercana (típicamente N = 256 o N = 512 muestras).",
        body_style
    ))
    
    story.append(Paragraph("Espectro de Magnitud y Detección Fundamental", h2_style))
    story.append(Paragraph(
        "La magnitud física de cada frecuencia armónica se extrae mediante el espectro de magnitud normalizado:",
        body_style
    ))
    
    story.append(Paragraph(
        "|X[k]| = (2/N) &middot; &radic;( Re[X[k]]<sup>2</sup> + Im[X[k]]<sup>2</sup> )",
        equation_style
    ))
    
    story.append(Paragraph(
        "La frecuencia física asociada a cada índice espectral k se calcula utilizando la frecuencia de muestreo F<sub>s</sub>:",
        body_style
    ))
    
    story.append(Paragraph(
        "f[k] = k &middot; F<sub>s</sub> / N",
        equation_style
    ))
    
    story.append(Paragraph(
        "La <b>frecuencia fundamental de aleteo</b> (f<sub>fundamental</sub>) se define matemáticamente como la frecuencia que maximiza "
        "el espectro de magnitud (excluyendo el componente de corriente continua k = 0, que representa el sesgo medio de la señal):",
        body_style
    ))
    
    story.append(Paragraph(
        "f<sub>fundamental</sub> = f [ arg max<sub>k &gt; 0</sub> (|X[k]|) ]",
        equation_style
    ))
    story.append(Paragraph(
        "Este cálculo espectral permite verificar que el movimiento de las alas de la simulación mantiene de manera robusta la frecuencia "
        "deseada por el usuario (~5 Hz), filtrando ruidos numéricos o variaciones menores introducidas por la tasa de refresco del navegador.",
        body_style
    ))
    story.append(PageBreak())
    
    # ----------------------------------------------------
    # PAGE 5: KINEMATIC SIMULATION & WING PROFILE
    # ----------------------------------------------------
    story.append(Paragraph("5. Simulación Cinemática y Perfil Alar", title_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=2, spaceAfter=10))
    
    story.append(Paragraph(
        "El vuelo del Alkamari Andino no sigue un movimiento senoidal simple como el de los colibríes. Físicamente, "
        "las aves de tamaño medio a grande presentan un aleteo asimétrico: el descenso alar (downstroke, que genera la fuerza de "
        "sustentación) es más rápido y enérgico, mientras que el ascenso (upstroke) es más lento y aerodinámicamente pasivo. "
        "Para modelar esta biomecánica de manera realista, se utiliza una ecuación angular no lineal con un segundo armónico:",
        body_style
    ))
    
    story.append(Paragraph(
        "&theta;(t) = A &middot; [ sin(&omega;t) + 0.08 &middot; sin(2&omega;t) ] / 1.08",
        equation_style
    ))
    
    story.append(Paragraph(
        "Donde <b>A</b> es la amplitud angular máxima ajustable (típicamente &plusmn;35&deg;), <b>&omega; = 2&pi;f</b> es la velocidad "
        "angular base y <b>f</b> es la frecuencia de vuelo del ave (~5 Hz). El factor 1.08 en el denominador normaliza la función "
        "para asegurar que el rango dinámico del aleteo se mantenga estrictamente entre [-A, A].",
        body_style
    ))
    
    story.append(Paragraph("Velocidad y Aceleración Angular", h2_style))
    story.append(Paragraph(
        "Derivando analíticamente la posición angular &theta;(t) respecto al tiempo, se obtienen las ecuaciones exactas para "
        "la velocidad angular y la aceleración angular, fundamentales para evaluar las cargas mecánicas sobre las articulaciones del ala:",
        body_style
    ))
    
    story.append(Paragraph(
        "&theta;'(t) = A &middot; &omega; &middot; [ cos(&omega;t) + 0.16 &middot; cos(2&omega;t) ] / 1.08<br/>"
        "&theta;''(t) = A &middot; &omega;<sup>2</sup> &middot; [ -sin(&omega;t) - 0.32 &middot; sin(2&omega;t) ] / 1.08",
        equation_style
    ))
    
    story.append(Paragraph("Geometría del Perfil Alar", h2_style))
    story.append(Paragraph(
        "El ala del Alkamari es ancha, robusta y optimizada para planeos térmicos y aleteos estables en el aire enrarecido del Altiplano "
        "(3000-4500 msnm). A continuación, se detallan las coordenadas normalizadas del perfil del ala (desde la base del cuerpo t=0 "
        "hasta la punta t=1) utilizadas por el motor de splines para dibujar las alas en el Canvas 2D:",
        body_style
    ))
    
    profile_data = [
        [Paragraph("<b>Punto</b>", table_header_style), Paragraph("<b>T (Normalizado)</b>", table_header_style), Paragraph("<b>X (Espesor relativo)</b>", table_header_style), Paragraph("<b>Y (Desviación relativa)</b>", table_header_style)],
        [Paragraph("Base (Cuerpo)", table_text_style), Paragraph("0.00", code_style), Paragraph("0.00", code_style), Paragraph("0.00", code_style)],
        [Paragraph("Ala Interna 1", table_text_style), Paragraph("0.15", code_style), Paragraph("0.20", code_style), Paragraph("0.12", code_style)],
        [Paragraph("Ala Interna 2", table_text_style), Paragraph("0.30", code_style), Paragraph("0.42", code_style), Paragraph("0.18", code_style)],
        [Paragraph("Articulación (Codo)", table_text_style), Paragraph("0.50", code_style), Paragraph("0.65", code_style), Paragraph("0.16", code_style)],
        [Paragraph("Ala Externa 1", table_text_style), Paragraph("0.70", code_style), Paragraph("0.83", code_style), Paragraph("0.10", code_style)],
        [Paragraph("Ala Externa 2", table_text_style), Paragraph("0.85", code_style), Paragraph("0.94", code_style), Paragraph("0.04", code_style)],
        [Paragraph("Extremo (Punta)", table_text_style), Paragraph("1.00", code_style), Paragraph("1.00", code_style), Paragraph("0.00", code_style)]
    ]
    profile_table = Table(profile_data, colWidths=[120, 110, 134, 140])
    profile_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
    ]))
    story.append(profile_table)
    story.append(PageBreak())
    
    # ----------------------------------------------------
    # PAGE 6: DATA CAPTURE & BACKEND PYTHON
    # ----------------------------------------------------
    story.append(Paragraph("6. Captura de Datos y Telemetría", title_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=2, spaceAfter=10))
    
    story.append(Paragraph(
        "El sistema incorpora un registrador automático en caliente (hot logger) diseñado para capturar la telemetría "
        "biomecánica en instantes exactos. Cada vez que el usuario presiona el botón <i>Play/Pause</i>, la simulación "
        "entra en estado estacionario y se realiza una captura instantánea de los siguientes parámetros físicos de vuelo:",
        body_style
    ))
    
    capture_features = [
        "<b>Timestamp:</b> Hora exacta del registro en formato ISO para trazabilidad cronológica.",
        "<b>Tiempo de Simulación (t):</b> El instante del ciclo de vuelo actual (0 a T segundos).",
        "<b>Ángulo actual (&theta;(t)):</b> Desviación angular instantánea del ala en grados sexagesimales.",
        "<b>Velocidad Angular (&theta;'(t)):</b> Tasa de variación del ángulo, medida en rad/s o deg/s.",
        "<b>Aceleración Angular (&theta;''(t)):</b> Fuerza inercial proporcional en rad/s² o deg/s².",
        "<b>Fase de Vuelo:</b> Indicador dinámico de ascenso ('Upstroke') o descenso ('Downstroke').",
        "<b>Análisis de Fourier local:</b> Resultados de frecuencia dominante calculados por la FFT."
    ]
    for feat in capture_features:
        story.append(Paragraph(f"&bull; {feat}", bullet_style))
    
    story.append(Spacer(1, 10))
    
    # Backend
    story.append(Paragraph("7. Backend en Python y API REST", h1_style))
    story.append(Paragraph(
        "El backend del proyecto, implementado en <i>server.py</i> mediante el microframework Flask, proporciona "
        "servicios redundantes de cálculo biomecánico y análisis espectral de alta precisión mediante la biblioteca "
        "estándar científica de Python (SciPy y NumPy).",
        body_style
    ))
    
    story.append(Paragraph("Especificación de los Endpoints de la API", h2_style))
    
    api_data = [
        [Paragraph("<b>Endpoint</b>", table_header_style), Paragraph("<b>Método</b>", table_header_style), Paragraph("<b>Payload Recibido (JSON)</b>", table_header_style), Paragraph("<b>Respuesta del Servidor (JSON)</b>", table_header_style)],
        [
            Paragraph("/api/health", code_style),
            Paragraph("GET", code_style),
            Paragraph("Ninguno", table_text_style),
            Paragraph('{"status": "healthy", "engine": "scipy"}', code_style)
        ],
        [
            Paragraph("/api/compute", code_style),
            Paragraph("POST", code_style),
            Paragraph('{\n  "frequency": 5.0,\n  "amplitude": 35.0,\n  "duration": 2.0,\n  "sampleRate": 512\n}', code_style),
            Paragraph('{\n  "engine": "scipy+numpy",\n  "fourier": {\n    "fundamentalFreq": 5.0\n  }\n}', code_style)
        ]
    ]
    api_table = Table(api_data, colWidths=[90, 60, 164, 190])
    api_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
    ]))
    story.append(api_table)
    story.append(PageBreak())
    
    # ----------------------------------------------------
    # PAGE 7: UI & BIOLOGICAL DATA
    # ----------------------------------------------------
    story.append(Paragraph("8. Interfaz de Usuario y Controles", title_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=2, spaceAfter=10))
    
    story.append(Paragraph(
        "El diseño de la aplicación web sigue los estándares estéticos modernos 'Rich Aesthetics' en modo oscuro. "
        "El espacio de trabajo visual se estructura en un Layout de 3 Columnas optimizado para pantallas de alta resolución:",
        body_style
    ))
    
    ui_cols = [
        "<b>Panel Izquierdo (Configuración y Biología):</b> Contiene sliders deslizantes para ajustar la frecuencia de aleteo (Hz), "
        "amplitud angular (&deg;), longitud del ala (px) y velocidad temporal. También muestra las fichas de datos biológicos del ave.",
        "<b>Panel Central (Canvas de Simulación):</b> Renderiza la simulación en tiempo real del Alkamari Andino mediante gráficos vectoriales Canvas 2D, "
        "junto con el arco angular de batido, estelas de partículas de aire y sombras.",
        "<b>Panel Derecho (Telemetría e Historial):</b> Grafica en tiempo real la señal angular interpolada, el espectro de Fourier "
        "e incluye la tabla interactiva de las capturas de datos realizadas por el usuario."
    ]
    for col in ui_cols:
        story.append(Paragraph(f"&bull; {col}", bullet_style))
        
    story.append(Spacer(1, 10))
    
    # Biological data
    story.append(Paragraph("9. Ficha de Datos Biológicos: Vanellus resplendens", h1_style))
    story.append(Paragraph(
        "Los parámetros del motor biomecánico y de simulación cinemática se han contrastado "
        "con los registros biológicos del <b>Alkamari Andino</b> (ave endémica del altiplano paceño) para asegurar "
        "la validez física del modelo computacional:",
        body_style
    ))
    
    bio_data = [
        [Paragraph("<b>Parámetro Biológico</b>", table_header_style), Paragraph("<b>Valor Nominal / Estado</b>", table_header_style), Paragraph("<b>Implicación en la Simulación</b>", table_header_style)],
        [Paragraph("Nombre Científico", table_text_style), Paragraph("<i>Vanellus resplendens</i>", table_text_style), Paragraph("Especie de estudio de la familia Charadriidae.", table_text_style)],
        [Paragraph("Tamaño y Peso", table_text_style), Paragraph("35 - 40 cm | 300 - 400 g", table_text_style), Paragraph("Define la escala del cuerpo y fuerzas de inercia.", table_text_style)],
        [Paragraph("Frecuencia de Aleteo", table_text_style), Paragraph("4.0 - 6.0 Hz (Nominal: 5 Hz)", table_text_style), Paragraph("Rango de oscilación del ala del motor cinemático.", table_text_style)],
        [Paragraph("Envergadura Alar", table_text_style), Paragraph("~75 cm", table_text_style), Paragraph("Escala del largo del ala en la simulación Canvas.", table_text_style)],
        [Paragraph("Patrón de Vuelo", table_text_style), Paragraph("Planeo corto con aleteo amplio", table_text_style), Paragraph("Determina el uso de asimetría en la ecuación angular.", table_text_style)],
        [Paragraph("Altitud de Hábitat", table_text_style), Paragraph("3000 - 4500 msnm", table_text_style), Paragraph("El aire menos denso requiere batidos de alta amplitud.", table_text_style)],
        [Paragraph("Estado de Conservación", table_text_style), Paragraph("Preocupación menor (LC)", table_text_style), Paragraph("Estado taxonómico según la lista roja de la UICN.", table_text_style)]
    ]
    bio_table = Table(bio_data, colWidths=[130, 150, 224])
    bio_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
    ]))
    story.append(bio_table)
    story.append(PageBreak())
    
    # ----------------------------------------------------
    # PAGE 8: REFERENCES & CONCLUSION
    # ----------------------------------------------------
    story.append(Paragraph("10. Referencias y Conclusión", title_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=2, spaceAfter=10))
    
    story.append(Paragraph("Conclusión", h2_style))
    story.append(Paragraph(
        "El desarrollo del simulador biomecánico para el Alkamari Andino (<i>Vanellus resplendens</i>) representa una sinergia efectiva "
        "entre los campos de la física del vuelo, la ornitología altoandina y el análisis computacional. "
        "La integración exitosa de los Splines Cúbicos Naturales asegura una representación visualmente realista y anatómicamente "
        "coherente de la deformación alar en cada ciclo de batido. Asimismo, el análisis espectral por transformada rápida de Fourier "
        "aporta rigor matemático al verificar de manera instantánea el comportamiento dinámico del vuelo simulado.",
        body_style
    ))
    story.append(Paragraph(
        "Este modelo matemático no solo proporciona una herramienta didáctica e interactiva de gran valor para la comprensión de "
        "la biomecánica animal, sino que también establece las bases metodológicas para la modelación de otras especies aviares de la "
        "región andina, permitiendo estudiar adaptaciones específicas al vuelo en condiciones extremas de altitud en el altiplano de La Paz, Bolivia.",
        body_style
    ))
    
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("Referencias Bibliográficas", h2_style))
    
    ref_style = ParagraphStyle('RefStyle', parent=body_style, leftIndent=20, firstLineIndent=-20)
    
    refs = [
        "1. De Boor, C. (2001). <i>A Practical Guide to Splines</i> (Revised Edition). Springer-Verlag. New York.",
        "2. Cooley, J. W., & Tukey, J. W. (1965). An algorithm for the machine calculation of complex Fourier series. <i>Mathematics of Computation</i>, 19(90), 297-301.",
        "3. Pennycuick, C. J. (2008). <i>Modelling the Flying Bird</i>. Practical Biology Series. Academic Press. Elsevier.",
        "4. Fjeldså, J., & Krabbe, N. (1990). <i>Birds of the High Andes</i>. Apollo Books. Svendborg, Denmark.",
        "5. Herzog, W. (2000). <i>Skeletal Muscle Mechanics: From Mechanisms to Function</i>. John Wiley & Sons Ltd. Chichester.",
        "6. Universidad Mayor de San Andrés (2026). Material de soporte curricular en Biomecánica Matemática. La Paz, Bolivia."
    ]
    for ref in refs:
        story.append(Paragraph(ref, ref_style))
        
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Report generated successfully: {filename}")

if __name__ == "__main__":
    build_pdf()
