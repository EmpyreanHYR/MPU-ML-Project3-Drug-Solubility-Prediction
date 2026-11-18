\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{assignment}[2026/10/24 Extended homework class]
\LoadClass[11pt,letterpaper]{article}

% Page, typography and language
\RequirePackage[left=2cm,right=2cm,top=1.7cm,bottom=2cm,headheight=14pt]{geometry}
\RequirePackage[T1]{fontenc}
\RequirePackage{lmodern}
\RequirePackage{microtype}
\RequirePackage[dvipsnames,table]{xcolor}
\RequirePackage{graphicx}
\RequirePackage{grffile}
\RequirePackage{float}
\RequirePackage{placeins}
\RequirePackage{caption}
\RequirePackage{subcaption}
\RequirePackage{wrapfig}
\RequirePackage{adjustbox}
\RequirePackage{pdflscape}

% Equations and references
\RequirePackage{amsmath,amssymb,amsthm,mathtools}
\RequirePackage{bm}
\RequirePackage{siunitx}
\RequirePackage{enumitem}
\RequirePackage{booktabs}
\RequirePackage{array}
\RequirePackage{tabularx}
\RequirePackage{longtable}
\RequirePackage{xltabular}
\RequirePackage{multirow}
\RequirePackage{makecell}
\RequirePackage{threeparttable}
\RequirePackage{threeparttablex}
\RequirePackage{colortbl}
\RequirePackage{algorithm}
\RequirePackage{algpseudocode}
\RequirePackage{listings}
\RequirePackage[most]{tcolorbox}
\RequirePackage{etoolbox}
\RequirePackage{xparse}
\RequirePackage{fancyhdr}
\RequirePackage{lastpage}
\RequirePackage{hyperref}
\RequirePackage[capitalise,noabbrev,nameinlink]{cleveref}

\definecolor{AssignmentBlue}{HTML}{315F87}
\definecolor{AssignmentMint}{HTML}{E9F5EF}
\definecolor{AssignmentCodeBG}{HTML}{F7F8FA}
\definecolor{AssignmentOrange}{HTML}{C56228}
\hypersetup{colorlinks=true,linkcolor=AssignmentBlue,citecolor=AssignmentBlue,urlcolor=AssignmentBlue}
\urlstyle{same}
\sisetup{detect-all}
\setlist{itemsep=0.2em,topsep=0.4em}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0.45em}
\renewcommand{\arraystretch}{1.17}
\setlength{\tabcolsep}{6pt}
\setcounter{topnumber}{3}
\setcounter{bottomnumber}{2}
\setcounter{totalnumber}{5}
\renewcommand{\topfraction}{0.9}
\renewcommand{\bottomfraction}{0.8}
\renewcommand{\textfraction}{0.08}
\renewcommand{\floatpagefraction}{0.75}
\captionsetup{font=small,labelfont=bf}

% Highlighting: backwards compatible \hword command, multiline highlight and note box.
\newtcbox{\hword}[1][orange]{on line,arc=0.3mm,auto outer arc,colback=#1!12,colframe=#1!60!black,colupper=black,boxsep=0mm,left=0.3mm,right=0.3mm,top=0.4mm,bottom=0.4mm,boxrule=0.2mm}
\NewDocumentCommand{\highlight}{O{yellow} m}{\colorbox{#1!25}{\strut #2}}
\newtcolorbox{importantbox}[1][]{breakable,colback=yellow!7,colframe=AssignmentOrange!65!black,title=Important,#1}
\newtcolorbox{notebox}[1][]{breakable,colback=AssignmentBlue!4,colframe=AssignmentBlue!50,title=Note,#1}
\newtcolorbox{resultbox}[1][]{breakable,colback=AssignmentMint,colframe=ForestGreen!60!black,title=Result,#1}

% Portable listings, no shell escape/Pygments required.
\lstdefinestyle{assignment}{
  frame=single,framerule=0.35pt,rulecolor=\color{black!18},
  backgroundcolor=\color{AssignmentCodeBG},
  numbers=left,numberstyle=\tiny\color{black!45},numbersep=9pt,
  basicstyle=\small\ttfamily,keywordstyle=\bfseries\color{BrickRed},
  identifierstyle=\color{black!85},stringstyle=\color{ForestGreen},
  commentstyle=\itshape\color{Violet},
  breaklines=true,breakatwhitespace=false,columns=fullflexible,
  keepspaces=true,tabsize=4,showstringspaces=false,
  xleftmargin=1.8em,framexleftmargin=1.3em,aboveskip=0.8em,belowskip=0.6em,
  captionpos=b,upquote=true,
}
\lstset{style=assignment}
\lstdefinelanguage{AssignmentPython}{language=Python,morekeywords={self,cls,True,False,None,async,await,match,case},sensitive=true}
\lstdefinelanguage{AssignmentMATLAB}{language=Matlab,morekeywords={arguments,end,parfor,spmd,classdef,properties,methods,events},sensitive=true}
\lstdefinelanguage{AssignmentR}{morekeywords={function,if,else,for,while,repeat,in,next,break,TRUE,FALSE,NULL,NA,NaN,Inf,library,require,return},sensitive=true,morecomment=[l]{\#},morestring=[b]",morestring=[b]',alsoletter={._}}
\lstdefinelanguage{AssignmentHTML}{language=HTML,sensitive=false,morekeywords={main,section,article,nav,header,footer,figure,figcaption,video,canvas}}
\lstdefinestyle{python}{style=assignment,language=AssignmentPython}
\lstdefinestyle{matlab}{style=assignment,language=AssignmentMATLAB}
\lstdefinestyle{r}{style=assignment,language=AssignmentR}
\lstdefinestyle{html}{style=assignment,language=AssignmentHTML}
\lstdefinestyle{cpp}{style=assignment,language=C++}
\lstdefinestyle{bash}{style=assignment,language=bash}
\lstdefinestyle{sql}{style=assignment,language=SQL}
\lstdefinestyle{json}{style=assignment,morestring=[b]",morecomment=[l]{//}}
\NewDocumentCommand{\codefile}{O{} m m}{\lstinputlisting[style=#2,#1]{#3}}
\lstnewenvironment{pythoncode}[1][]{\lstset{style=python,#1}}{}
\lstnewenvironment{matlabcode}[1][]{\lstset{style=matlab,#1}}{}
\lstnewenvironment{rcode}[1][]{\lstset{style=r,#1}}{}
\lstnewenvironment{htmlcode}[1][]{\lstset{style=html,#1}}{}
% For ipynb, convert first with tools/ipynb_to_tex.py (generates a .py text file).

% Algorithms / tables / float controls
\floatname{algorithm}{Algorithm}
\crefname{algorithm}{Algorithm}{Algorithms}
\crefname{lstlisting}{Listing}{Listings}
\NewDocumentCommand{\FloatBarrierHere}{}{\FloatBarrier}
\NewDocumentCommand{\FixedFigure}{m m m}{%
  \begin{figure}[H]\centering\includegraphics[width=#1]{#2}\caption{#3}\end{figure}}
\newcolumntype{Y}{>{\raggedright\arraybackslash}X}
\newcolumntype{Z}{>{\centering\arraybackslash}X}
\newcommand{\tablehead}[1]{\rowcolor{AssignmentBlue!12}\bfseries #1}

% Unified footer on every page, including pages using the plain page style.
\newcommand{\assignmentPageNumber}{\thepage/\pageref{LastPage}}
\fancypagestyle{assignment}{%
  \fancyhf{}\fancyfoot[C]{\assignmentPageNumber}%
  \renewcommand{\headrulewidth}{0pt}%
  \renewcommand{\footrulewidth}{0pt}%
}
\pagestyle{assignment}
\fancypagestyle{plain}{%
  \fancyhf{}\fancyfoot[C]{\assignmentPageNumber}%
  \renewcommand{\headrulewidth}{0pt}%
  \renewcommand{\footrulewidth}{0pt}%
}
% Preserve the old public command as an alias; footer is now enabled by default.
\NewDocumentCommand{\enableAssignmentFooter}{}{\pagestyle{assignment}}

% Original visual arrangement: student details at left, course/assignment
% centered, and an independently sized logo at right. Preserve two lines
% for each text block rather than flattening everything into one line.
\newcommand{\assignmentTitle}[5]{
    \begin{flushleft}
    Student Name: #1\\
    Student ID: #2
    \end{flushleft}

    \begin{flushright}\vspace{-15mm}
    \includegraphics[height=2cm]{#3}
    \end{flushright}

    \begin{center}\vspace{-1.5cm}
    \textbf{\large #4} \\
    \textbf{#5}
    \end{center}

    \noindent\rule{\linewidth}{.6pt}
}
