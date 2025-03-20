let inputBox;
let analyseButton;
let resetButton;

//Storage of analyses
let analyseWords = [];
let backupanalyseWords = [];
let biasSent = [];
let totalSent = [];
let biasRanges = [];

//Particle system
let particles = [];
let particlesGathering = false;
let gatherTarget;
let gatherPoints = [];

let font;
const MAX_PARTICLES = 2500;
const unifiedFontSize = 18;

let state = "idle";

let apiKey =
  "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";

function preload() {
  font = loadFont("AaWeiTaNingMengCha-2.ttf");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(font);
  textSize(unifiedFontSize);
  background(0);

  gatherTarget = { x: 220, y: height - 30 }; //Particle target position(percentage) 

  inputBox = createElement("textarea", "Enter text for analysis");
  inputBox.position(20, 20);
  inputBox.size(windowWidth - 65, windowHeight / 5);
  inputBox.style("font-size", "16px");
  inputBox.style("padding", "10px");
  inputBox.style("resize", "none");
  inputBox.style("background-color", "black");
  inputBox.style("color", "white");

  analyseButton = createButton("Analyse Text");
  analyseButton.position(20, 20 + windowHeight / 4);
  analyseButton.mousePressed(handleAnalyse);

  resetButton = createButton("Reset");
  resetButton.position(150, 20 + windowHeight / 4);
  resetButton.mousePressed(handleReset);
}

function draw() {
  background(0);

  fill(255);
  textSize(15);
  textAlign(LEFT);
  text("Proportion of biased text：", 20, height - 30);

  for (let i = 0; i < particles.length; i++) {
    if (particlesGathering) {
      particles[i].gatherToTarget();
    } else {
      particles[i].update();
    }
    particles[i].display();
  }

  if (
    particlesGathering &&
    particles.every(function (p) {
      return p.isAtTarget();
    })
  ) {
    particlesGathering = false;
  }

  if (!particlesGathering && particles.length === 0) {
    let { lines, lineHeight, startY } = calculateLayout();

    if (state === "highlight") {
      displayHighlightLines(lines, startY, lineHeight);
    } else {
      displayParsedLines(lines, startY, lineHeight);
    }
  }
}

function handleReset() {
  inputBox.value("");

  analyseWords = [];
  backupanalyseWords = [];
  biasRanges = [];
  particles = [];
  biasSent = [];
  totalSent = [];
  gatherPoints = [];

  particlesGathering = false;
  state = "idle";

  background(0);
}

function mousePressed() {
  if (state === "idle" && biasRanges.length > 0) {
    state = "highlight";
  } else if (state === "highlight") {
    explodeBiasSentences();
    state = "explode";
  } else if (state === "explode") {
    generateGatherPoints();
    assignParticlesToPoints();
    particlesGathering = true;
    state = "idle";
  }
}

function handleAnalyse() {
  startAnalysis();
  analyseWithGPT();
}

function startAnalysis() {
  analyseWords = [];
  biasRanges = [];
  particlesGathering = false;
  particles = [];
  let userInput = inputBox.value();
  splitTextToWords(userInput);
  backupanalyseWords = analyseWords.map(function (token) {
    return Object.assign({}, token);
  });
}

function splitTextToWords(text) {
  const regex = /([\u4e00-\u9fa5]|[a-zA-Z0-9_]+|\s+|[^\w\s\u4e00-\u9fa5]|\n)/g;
  let matches = text.match(regex);
  if (matches) {
    analyseWords = matches.map(function (item, idx) {
      return {
        word: item,
        biasSentence: false,
        index: idx,
      };
    });
  }
}

function calculateLines(wordsArray, maxWidth) {
  let lines = [];
  let currentLine = [];
  let currentLineWidth = 0;

  for (let token of wordsArray) {
    if (token.word === "\n") {
      lines.push(currentLine);
      currentLine = [];
      currentLineWidth = 0;
      continue;
    }

    let tokenWidth = textWidth(token.word);
    if (currentLineWidth + tokenWidth > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [];
      currentLineWidth = 0;
    }

    currentLine.push(token);
    currentLineWidth += tokenWidth;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

function calculateLayout() {
  let maxLineWidth = width - 40;
  let lines = calculateLines(analyseWords, maxLineWidth);
  let baseTextSize = unifiedFontSize;
  let lineHeight = baseTextSize * 1.5;
  let totalTextHeight = lines.length * lineHeight;
  let maxAllowedHeight = height - 150;

  if (totalTextHeight > maxAllowedHeight) {
    let scaleFactor = maxAllowedHeight / totalTextHeight;
    baseTextSize *= scaleFactor;
    lineHeight = baseTextSize * 1.5;
  }

  textSize(baseTextSize);
  totalTextHeight = lines.length * lineHeight;
  let startY = (height - totalTextHeight) / 2;

  return { lines, baseTextSize, lineHeight, startY };
}

function displayParsedLines(lines, startY, lineHeight) {
  let y = startY;

  for (let line of lines) {
    let x = 20;

    for (let token of line) {
      let tokenWidth = textWidth(token.word);

      if (x + tokenWidth > width - 20) {
        y += lineHeight;
        x = 20;
      }

      fill(token.biasSentence ? color(237, 250, 0) : 255);
      text(token.word, x, y);
      x += tokenWidth;
    }

    y += lineHeight;
  }
}

function displayHighlightLines(lines, startY, lineHeight) {
  let y = startY;
  let blink = frameCount % 30 < 15;

  for (let line of lines) {
    let x = 20;

    for (let token of line) {
      let tokenWidth = textWidth(token.word);

      if (x + tokenWidth > width - 20) {
        y += lineHeight;
        x = 20;
      }

      if (token.biasSentence) {
        fill(blink ? color(237, 250, 0) : color(237, 250, 0, 100));
      } else {
        fill(255);
      }

      text(token.word, x, y);
      x += tokenWidth;
    }

    y += lineHeight;
  }
}

function markBiasSentences() {
  let fullText = analyseWords
    .map(function (p) {
      return p.word;
    })
    .join("");

  biasRanges = [];
  let currentIndex = 0;

  totalSent.forEach(function (sentence) {
    let trimmed = sentence.trim();
    if (trimmed.length === 0) return;

    //Find the position of the current sentence in the complete text
    let idx = fullText.indexOf(trimmed, currentIndex);
    if (idx === -1) return;

    let endIdx = idx + trimmed.length;
    let startTokenIdx = -1;
    let endTokenIdx = -1;
    let charCount = 0;

    for (let i = 0; i < analyseWords.length; i++) {
      let tokenLength = analyseWords[i].word.length;
      if (startTokenIdx === -1 && charCount + tokenLength > idx) {
        startTokenIdx = i;
      }
      if (charCount < endIdx && charCount + tokenLength >= endIdx) {
        endTokenIdx = i;
        break;
      }
      charCount += tokenLength;
    }

    if (
      biasSent
        .map(function (s) {
          return s.trim();
        })
        .includes(trimmed)
    ) {
      for (let i = startTokenIdx; i <= endTokenIdx; i++) {
        analyseWords[i].biasSentence = true;
      }

      biasRanges.push({
        sentence: trimmed,
        startIdx: startTokenIdx,
        endIdx: endTokenIdx,
      });
    }

    currentIndex = endIdx;
  });
}

function getTokenPosition(tokenIndex, lines, startY, lineHeight) {
  let y = startY;

  for (let line of lines) {
    let x = 20;

    for (let token of line) {
      if (token.index === tokenIndex) {
        return { x, y };
      }

      x += textWidth(token.word);
    }

    y += lineHeight;
  }

  return { x: 20, y: startY };
}

function explodeBiasSentences() {
  let { lines, lineHeight, startY } = calculateLayout();
  let sortedRanges = biasRanges.slice().sort(function (a, b) {
    return b.startIdx - a.startIdx;
  });
  for (let range of sortedRanges) {
    let pos = getTokenPosition(range.startIdx, lines, startY, lineHeight);
    explodeSentence(range.startIdx, range.endIdx, pos.x, pos.y);
  }
}

function explodeSentence(startIdx, endIdx, sentenceX, sentenceY) {
  let x = sentenceX;

  for (let i = startIdx; i <= endIdx; i++) {
    let token = analyseWords[i];
    if (!token) continue;

    let tokenWidth = textWidth(token.word);
    let particleCount = int(random(20, 40));

    for (let p = 0; p < particleCount; p++) {
      addParticle(x + tokenWidth / 2, sentenceY, [237, 250, 0]);
    }

    x += tokenWidth;
  }

  analyseWords.splice(startIdx, endIdx - startIdx + 1);
}

function generateGatherPoints() {
  gatherPoints = [];
  let proportion =
    totalSent.length > 0 ? (biasSent.length / totalSent.length) * 100 : 0;
  let proportionText = nf(proportion, 1, 1) + "%";
  let points = font.textToPoints(
    proportionText,
    gatherTarget.x,
    gatherTarget.y,
    unifiedFontSize * 2,
    { sampleFactor: 0.2 }
  );
  gatherPoints = points;
}

function assignParticlesToPoints() {
  for (let i = 0; i < particles.length; i++) {
    let targetIdx = i % gatherPoints.length;
    let pt = gatherPoints[targetIdx];
    particles[i].setTarget(pt.x, pt.y);
  }
}

function addParticle(x, y, col = [255, 255, 255]) {
  if (particles.length < MAX_PARTICLES) {
    particles.push(new Particle(x, y, col));
  }
}

class Particle {
  constructor(x, y, col = [255, 255, 255]) {
    this.x = x;
    this.y = y;
    let expForce = random(5, 12);
    let angle = random(TWO_PI);
    this.vx = cos(angle) * expForce;
    this.vy = sin(angle) * expForce;
    this.alpha = 255;
    this.size = random(2, 4);
    this.color = col;
    this.targetX = null;
    this.targetY = null;
  }

  setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98;
    this.vy *= 0.98;
  }

  gatherToTarget() {
    if (this.targetX === null || this.targetY === null) return;
    let dx = this.targetX - this.x;
    let dy = this.targetY - this.y;
    let dist = sqrt(dx * dx + dy * dy);

    if (dist > 0.5) {
      this.x += dx * 0.1;
      this.y += dy * 0.1;
    }

    this.alpha = 255;
  }

  display() {
    noStroke();
    fill(this.color[0], this.color[1], this.color[2], this.alpha);
    ellipse(this.x, this.y, this.size);
  }

  isDead() {
    return false;
  }

  isAtTarget() {
    if (this.targetX === null || this.targetY === null) return false;
    let dx = this.targetX - this.x;
    let dy = this.targetY - this.y;
    return sqrt(dx * dx + dy * dy) < 0.5;
  }
}

async function analyseWithGPT() {
  const userInput = inputBox.value();
  const prompt = `
You are a language analysis expert.
1. Split into complete sentences (Chinese + English mixed).
2. Identify sentences with gender bias/discrimination.
Return JSON:
{
  "total_sentences": [ "sentence 1", "sentence 2", ... ],
  "biased_sentences": [ "sentence 1", "sentence 2", ... ]
}
Text to analyse:
${userInput}
  `;

  const data = {
    model: "gpt-3.5-turbo-1106",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (result.error) return console.log(result.error);

    const gptContent = result.choices[0].message.content;
    const jsonResult = JSON.parse(gptContent);

    totalSent = jsonResult.total_sentences;
    biasSent = jsonResult.biased_sentences;
    markBiasSentences();
  } catch (error) {
    console.log("fetch error", error);
  }
}
