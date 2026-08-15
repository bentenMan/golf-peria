/* =========================================================
   ゴルフ ローカルペリア計算
   OCR対応版
========================================================= */

let hiddenHoles = [];
let players = [];

let selectedImage = null;
let ocrWorker = null;


/* =========================================================
   ① 隠しホール生成
========================================================= */

function generateHidden() {

  hiddenHoles = [];

  while (hiddenHoles.length < 9) {

    const h = Math.floor(Math.random() * 18) + 1;

    if (!hiddenHoles.includes(h)) {
      hiddenHoles.push(h);
    }
  }

  hiddenHoles.sort((a, b) => a - b);

  document.getElementById("hiddenResult").innerText =
    "隠しホール: " + hiddenHoles.join(", ");

  createParInputs();
}


/* =========================================================
   PAR入力欄
========================================================= */

function createParInputs() {

  const parDiv = document.getElementById("parInputs");

  parDiv.innerHTML = "";

  hiddenHoles.forEach((hole, index) => {

    const div = document.createElement("div");

    div.className = "par-item";

    div.innerHTML = `
      <span>H${hole}</span>
      <input
        id="par_${index}"
        type="number"
        min="1"
        max="10"
        value="4">
    `;

    parDiv.appendChild(div);
  });
}


/* =========================================================
   ② プレーヤー追加
========================================================= */

function addPlayer(playerData = null) {

  if (players.length >= 10) {

    alert("最大10名までです");

    return;
  }

  const id = players.length;

  const player = {

    name: playerData?.name || "",

    scores:
      playerData?.scores
        ? normalizeScores(playerData.scores)
        : Array(18).fill(0)
  };

  players.push(player);

  renderPlayers();
}


/* =========================================================
   スコアの正規化
========================================================= */

function normalizeScores(scores) {

  const result = Array(18).fill(0);

  for (let i = 0; i < 18; i++) {

    const value = Number(scores[i]);

    if (
      Number.isFinite(value) &&
      value >= 1 &&
      value <= 20
    ) {
      result[i] = value;
    }
  }

  return result;
}


/* =========================================================
   プレーヤー画面を再描画
========================================================= */

function renderPlayers() {

  const container =
    document.getElementById("players");

  container.innerHTML = "";

  players.forEach((player, id) => {

    const div = document.createElement("div");

    div.className = "player";

    div.id = "player_" + id;

    let scoreHtml = "";

    for (let i = 0; i < 18; i++) {

      scoreHtml += `
        <div class="score-cell">

          <label>H${i + 1}</label>

          <input
            class="score-input"
            type="number"
            min="1"
            max="20"
            value="${player.scores[i] || ""}"
            onchange="setScore(${id}, ${i}, this.value)"
            oninput="setScore(${id}, ${i}, this.value)"
          >

        </div>
      `;
    }

    div.innerHTML = `

      <div class="player-title">

        <strong>プレーヤー${id + 1}</strong>

        <button
          class="delete-btn"
          onclick="removePlayer(${id})">
          削除
        </button>

      </div>

      <input
        class="player-name"
        type="text"
        placeholder="プレーヤー名"
        value="${escapeHtml(player.name)}"
        onchange="setName(${id}, this.value)"
      >

      <div class="front-nine">

        <div class="half-title">
          OUT（H1～H9）
        </div>

        ${scoreHtml.substring(
          0,
          scoreHtml.length
        )}

      </div>
    `;

    container.appendChild(div);
  });
}


/* =========================================================
   名前設定
========================================================= */

function setName(id, name) {

  if (!players[id]) return;

  players[id].name = name;
}


/* =========================================================
   スコア設定
========================================================= */

function setScore(id, hole, value) {

  if (!players[id]) return;

  const number = Number(value);

  players[id].scores[hole] =
    Number.isFinite(number) ? number : 0;
}


/* =========================================================
   プレーヤー削除
========================================================= */

function removePlayer(id) {

  if (!confirm("このプレーヤーを削除しますか？")) {
    return;
  }

  players.splice(id, 1);

  renderPlayers();
}


/* =========================================================
   全員クリア
========================================================= */

function clearPlayers() {

  if (
    players.length > 0 &&
    !confirm("プレーヤーを全員削除しますか？")
  ) {
    return;
  }

  players = [];

  renderPlayers();
}


/* =========================================================
   ③ 画像選択
========================================================= */

function handleImage(file) {

  if (!file) return;

  if (!file.type.startsWith("image/")) {

    alert("画像ファイルを選択してください。");

    return;
  }

  selectedImage = file;

  const preview =
    document.getElementById("imagePreview");

  preview.src = URL.createObjectURL(file);

  document
    .getElementById("imagePreviewArea")
    .classList.remove("hidden");

  document
    .getElementById("ocrButton")
    .disabled = false;

  document
    .getElementById("ocrRawArea")
    .classList.add("hidden");
}


/* =========================================================
   ④ OCR開始
========================================================= */

async function startOCR() {

  if (!selectedImage) {

    alert("画像を選択してください。");

    return;
  }

  const progressArea =
    document.getElementById("ocrProgressArea");

  const status =
    document.getElementById("ocrStatus");

  const progressBar =
    document.getElementById("progressBar");

  const button =
    document.getElementById("ocrButton");

  progressArea.classList.remove("hidden");

  button.disabled = true;

  progressBar.style.width = "0%";

  status.innerText =
    "OCRエンジンを準備しています...";

  try {

    /*
      日本語 + 英語を使用。

      Tesseract.jsはブラウザ内でOCR処理します。
    */

    ocrWorker = await Tesseract.createWorker(
      ["jpn", "eng"],
      1,
      {
        logger: message => {

          if (message.status) {

            status.innerText =
              message.status;
          }

          if (
            typeof message.progress === "number"
          ) {

            const percent =
              Math.round(
                message.progress * 100
              );

            progressBar.style.width =
              percent + "%";
          }
        }
      }
    );


    /*
      ゴルフスコアは基本的に数字が中心なので、
      数字を優先させる設定。

      ただし名前は日本語なので
      OCR自体は jpn + eng で実行します。
    */

    await ocrWorker.setParameters({

//     preserve_interword_spaces: "1",

//        tessedit_pageseg_mode:
//          Tesseract.PSM.SPARSE_TEXT
//
        
	  tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
	  tessedit_char_whitelist: "0123456789",
	  preserve_interword_spaces: "1"
          
    });


    status.innerText =
      "スコアカードを解析しています...";


    /*
      TSVを取得。
      文字だけでなく、
      x / y座標も取得します。
    */
	const processed = preprocessImage(document.getElementById("imagePreview"));
    const result =
      await ocrWorker.recognize(
        processed,
        {},
        {
          blocks: true,
          tsv: true
        }
      );


    const text =
      result.data.text || "";

    document.getElementById(
      "ocrRawText"
    ).textContent = text;

    document
      .getElementById("ocrRawArea")
      .classList.remove("hidden");


    /*
      OCR結果を解析
    */

    status.innerText =
      "スコア表を作成しています...";

    const detected =
      parseGolfScoreCard(
        result.data
      );


    if (
      !detected ||
      detected.length === 0
    ) {

      alert(
        "スコアを自動認識できませんでした。\n\n" +
        "写真を明るくして、スコアカード全体が入るように撮影してください。"
      );

      return;
    }


    /*
      現在のプレーヤーを置き換える
    */

    players = [];

    detected
      .slice(0, 10)
      .forEach(player => {

        players.push({

          name: player.name,

          scores:
            normalizeScores(
              player.scores
            )
        });

      });


    renderPlayers();


    status.innerText =
      `完了：${detected.length}名を認識しました。`;

    progressBar.style.width = "100%";


    alert(
      `${detected.length}名のスコアを読み取りました。\n\n` +
      "下のスコア表を確認・修正してから計算してください。"
    );

  } catch (error) {

    console.error(error);

    alert(
      "OCR処理中にエラーが発生しました。\n\n" +
      error.message
    );

  } finally {

    button.disabled = false;

    if (ocrWorker) {

      try {
        await ocrWorker.terminate();
      } catch (e) {
        console.warn(e);
      }

      ocrWorker = null;
    }
  }
}

function preprocessImage(imgElement) {
  let src = cv.imread(imgElement);
  cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY);
  cv.threshold(src, src, 150, 255, cv.THRESH_BINARY);
  cv.medianBlur(src, src, 3);
  cv.imwrite("processed.png", src);
  return "processed.png";
}

/* =========================================================
   OCR結果からスコアカードを解析
========================================================= */

function parseGolfScoreCard(data) {

  /*
    TesseractのTSVから単語を取得。

    v6/v7では output に tsv を指定した場合、
    data.tsv が文字列として返る。
  */

  const words = extractWordsFromTSV(data);

  if (!words.length) {

    return parseFromPlainText(
      data.text || ""
    );
  }


  /*
    数字だけの文字を抽出
  */

  const numericWords = words
    .map(word => {

      const normalized =
        normalizeOCRNumber(word.text);

      return {

        ...word,

        number:
          normalized !== null
            ? normalized
            : null
      };
    })
    .filter(w =>
      w.number !== null &&
      w.number >= 1 &&
      w.number <= 20
    );


  /*
    H1～H18のヘッダー位置を探す。
  */

  const headerCandidates =
    numericWords.filter(w =>
      w.number >= 1 &&
      w.number <= 18
    );


  /*
    同じY付近にある数字を
    ヘッダー候補としてグループ化。
  */

  const headerGroups =
    groupByY(headerCandidates);


  let headerRow = null;

  for (const group of headerGroups) {

    const unique =
      [...new Set(
        group.map(w => w.number)
      )];

    const count =
      unique.filter(
        n => n >= 1 && n <= 18
      ).length;

    if (count >= 5) {

      if (
        !headerRow ||
        count > headerRow.length
      ) {
        headerRow = group;
      }
    }
  }


  /*
    ヘッダーを認識できない場合、
    OCRテキスト方式にフォールバック。
  */

  if (!headerRow) {

    return parseFromPlainText(
      data.text || ""
    );
  }


  /*
    H1～H18のX座標を作る。
  */

  const holeX = {};

  headerRow.forEach(word => {

    const n = word.number;

    if (
      n >= 1 &&
      n <= 18 &&
      holeX[n] === undefined
    ) {
      holeX[n] = word.x;
    }
  });


  /*
    少なくとも複数ホールのX座標が必要
  */

  if (
    Object.keys(holeX).length < 5
  ) {

    return parseFromPlainText(
      data.text || ""
    );
  }


  /*
    全単語をY座標で行に分類
  */

  const rows =
    groupWordsIntoRows(words);


  /*
    ヘッダー行を除外
  */

  const headerY =
    average(
      headerRow.map(w => w.y)
    );


  const playerRows =
    rows.filter(row => {

      const y =
        average(
          row.map(w => w.y)
        );

      return Math.abs(y - headerY) > 15;
    });


  const results = [];


  /*
    各行をプレーヤーとして解析
  */

  playerRows.forEach(row => {

    const scores =
      Array(18).fill(0);

    let scoreCount = 0;


    row.forEach(word => {

      const number =
        normalizeOCRNumber(word.text);

      if (
        number === null ||
        number < 1 ||
        number > 20
      ) {
        return;
      }


      /*
        最も近いホールXを探す
      */

      let nearestHole = null;

      let nearestDistance = Infinity;

      for (let hole = 1; hole <= 18; hole++) {

        if (
          holeX[hole] === undefined
        ) {
          continue;
        }

        const distance =
          Math.abs(
            word.x - holeX[hole]
          );

        if (
          distance < nearestDistance
        ) {

          nearestDistance = distance;

          nearestHole = hole;
        }
      }


      /*
        ヘッダーから離れすぎている数字は
        スコアではない可能性が高い
      */

      if (
        nearestHole &&
        nearestDistance < 100
      ) {

        /*
          同じホールに複数数字が入った場合、
          最初のものを優先。
        */

        if (
          scores[nearestHole - 1] === 0
        ) {

          scores[nearestHole - 1] =
            number;

          scoreCount++;
        }
      }

    });


    /*
      スコアがある程度存在する行だけ採用
    */

    if (scoreCount >= 3) {

      /*
        スコアより左側にある文字を名前候補にする
      */

      const minScoreX =
        Math.min(
          ...Object.values(holeX)
        );


      const nameWords =
        row
          .filter(w =>
            w.x < minScoreX - 10
          )
          .map(w => w.text)
          .filter(text =>
            !/^[0-9０-９]+$/.test(text)
          );


      let name =
        nameWords.join(" ").trim();


      if (!name) {

        name =
          `プレーヤー${results.length + 1}`;
      }


      results.push({

        name,

        scores

      });

    }

  });


  /*
    重複行などを除去
  */

  return removeDuplicatePlayers(
    results
  );
}


/* =========================================================
   TSV解析
========================================================= */

function extractWordsFromTSV(data) {

  if (!data) return [];

  /*
    Tesseract.jsのdata.tsvがある場合
  */

  if (data.tsv) {

    const lines =
      data.tsv.trim().split(/\r?\n/);

    if (lines.length < 2) {
      return [];
    }


    const headers =
      lines[0].split("\t");

    const index = {};

    headers.forEach(
      (header, i) => {
        index[header] = i;
      }
    );


    const results = [];


    for (let i = 1; i < lines.length; i++) {

      const parts =
        lines[i].split("\t");

      const text =
        parts[index.text];


      if (!text || !text.trim()) {
        continue;
      }


      const conf =
        Number(
          parts[index.conf]
        );


      if (
        Number.isFinite(conf) &&
        conf < 20
      ) {
        continue;
      }


      results.push({

        text: text.trim(),

        x:
          Number(parts[index.left]) || 0,

        y:
          Number(parts[index.top]) || 0,

        width:
          Number(parts[index.width]) || 0,

        height:
          Number(parts[index.height]) || 0,

        confidence: conf

      });
    }


    return results;
  }


  /*
    data.words が存在する場合にも対応
  */

  if (
    Array.isArray(data.words)
  ) {

    return data.words.map(w => ({

      text: w.text || "",

      x:
        w.bbox?.x0 ??
        w.bbox?.left ??
        0,

      y:
        w.bbox?.y0 ??
        w.bbox?.top ??
        0,

      width:
        (w.bbox?.x1 || 0) -
        (w.bbox?.x0 || 0),

      height:
        (w.bbox?.y1 || 0) -
        (w.bbox?.y0 || 0),

      confidence:
        w.confidence || 0

    }));
  }


  return [];
}


/* =========================================================
   OCR数字の補正
========================================================= */

function normalizeOCRNumber(value) {

  if (!value) return null;

  let text =
    String(value).trim();


  /*
    全角数字 → 半角
  */

  text =
    text.replace(
      /[０-９]/g,
      c =>
        String.fromCharCode(
          c.charCodeAt(0) - 0xfee0
        )
    );


  /*
    OCRでよく起きる誤認識
  */

  text =
    text
      .replace(/[OoＯｏ]/g, "0")
      .replace(/[IlＩｌ]/g, "1")
      .replace(/[SsＳｓ]/g, "5")
      .replace(/[BbＢｂ]/g, "8");


  /*
    数字以外を削除
  */

  text =
    text.replace(
      /[^0-9]/g,
      ""
    );


  if (!text) {
    return null;
  }


  const number =
    Number(text);


  if (
    !Number.isFinite(number)
  ) {
    return null;
  }


  return number;
}


/* =========================================================
   Y座標でグループ化
========================================================= */

function groupByY(words) {

  const sorted =
    [...words].sort(
      (a, b) => a.y - b.y
    );

  const groups = [];

  // 行の高さを推定（平均値）
  const avgHeight = average(sorted.map(w => w.height));
  const tolerance = Math.max(20, avgHeight * 0.6);  // 動的に調整


  sorted.forEach(word => {

    let group =
      groups.find(g => {

        const avgY =
          average(
            g.map(x => x.y)
          );

        return Math.abs(
          word.y - avgY
        ) <= tolerance;
      });


    if (!group) {

      group = [];

      groups.push(group);
    }


    group.push(word);
  });


  return groups;
}


/* =========================================================
   行単位に分類
========================================================= */

function groupWordsIntoRows(words) {

  return groupByY(words)
    .map(row =>
      row.sort(
        (a, b) => a.x - b.x
      )
    );
}


/* =========================================================
   平均
========================================================= */

function average(values) {

  if (!values.length) return 0;

  return values.reduce(
    (a, b) => a + b,
    0
  ) / values.length;
}


/* =========================================================
   プレーヤー重複削除
========================================================= */

function removeDuplicatePlayers(playersData) {

  const result = [];

  playersData.forEach(player => {

    const scoreString =
      player.scores.join(",");


    const duplicate =
      result.some(p =>
        p.scores.join(",") ===
        scoreString
      );


    if (!duplicate) {

      result.push(player);
    }
  });


  return result;
}


/* =========================================================
   OCRテキストだけからの簡易解析
========================================================= */

function parseFromPlainText(text) {

  const lines =
    text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);


  const results = [];


  lines.forEach(line => {

    const tokens =
      line.split(/\s+/);


    const numbers =
      tokens
        .map(normalizeOCRNumber)
        .filter(
          n =>
            n !== null &&
            n >= 1 &&
            n <= 20
        );


    if (numbers.length >= 3) {

      const name =
        tokens
          .filter(token =>
            normalizeOCRNumber(token) === null
          )
          .join(" ")
          .trim();


      results.push({

        name:
          name ||
          `プレーヤー${results.length + 1}`,

        scores:
          normalizeScores(
            numbers.slice(0, 18)
          )

      });
    }
  });


  return results;
}


/* =========================================================
   HTMLエスケープ
========================================================= */

function escapeHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   ⑤ ペリア計算
========================================================= */

function calculate() {

  if (hiddenHoles.length === 0) {

    alert(
      "隠しホールを生成してください。"
    );

    return;
  }


  if (players.length === 0) {

    alert(
      "プレーヤーを追加してください。"
    );

    return;
  }


  /*
    PAR取得
  */

  const hiddenPars =
    hiddenHoles.map(
      (_, i) => {

        const input =
          document.getElementById(
            `par_${i}`
          );

        return Number(
          input.value
        );
      }
    );


  /*
    PARチェック
  */

  if (
    hiddenPars.some(
      par =>
        !Number.isFinite(par) ||
        par < 1
    )
  ) {

    alert(
      "隠しホールのPARを確認してください。"
    );

    return;
  }


  /*
    全プレーヤー計算
  */

  const results =
    players.map(p => {

      /*
        スコア未入力チェック
      */

      const missing =
        p.scores.some(
          score =>
            !Number.isFinite(score) ||
            score <= 0
        );


      if (missing) {

        return {

          name:
            p.name ||
            "名前未入力",

          error: true,

          gross: "-",
          hdcp: "-",
          net: "-"

        };
      }


      /*
        隠しホールスコア
      */

      const hiddenScores =
        hiddenHoles.map(
          h =>
            p.scores[h - 1]
        );


      const scoreTotal =
        hiddenScores.reduce(
          (a, b) => a + b,
          0
        );


      const parTotal =
        hiddenPars.reduce(
          (a, b) => a + b,
          0
        );


      /*
        オーバーパー
      */

      const overPar =
        scoreTotal - parTotal;


      /*
        現在の方式を維持
      */

      const hdcp =
        overPar * 1.6;


      /*
        グロス
      */

      const gross =
        p.scores.reduce(
          (a, b) => a + b,
          0
        );


      /*
        ネット
      */

      const net =
        gross - hdcp;


      return {

        name:
          p.name ||
          "名前未入力",

        error: false,

        gross,

        hdcp:
          hdcp.toFixed(1),

        net:
          net.toFixed(1)

      };

    });


  /*
    未入力者を最後へ
  */

  results.sort(
    (a, b) => {

      if (a.error && !b.error) {
        return 1;
      }

      if (!a.error && b.error) {
        return -1;
      }

      if (a.error && b.error) {
        return 0;
      }

      return (
        Number(a.net) -
        Number(b.net)
      );
    }
  );


  /*
    結果表示
  */

  const table =
    document.getElementById(
      "resultTable"
    );


  table.innerHTML = `

    <tr>
      <th>順位</th>
      <th>名前</th>
      <th>グロス</th>
      <th>ハンディ</th>
      <th>ネット</th>
    </tr>

    ${
      results.map(
        (r, i) => `

        <tr>

          <td>
            ${
              r.error
                ? "-"
                : i + 1
            }
          </td>

          <td>
            ${escapeHtml(r.name)}
          </td>

          <td>
            ${r.gross}
          </td>

          <td>
            ${r.hdcp}
          </td>

          <td>
            ${r.net}
          </td>

        </tr>

      `
      ).join("")
    }

  `;
}


/* =========================================================
   初期状態
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    renderPlayers();

  }
);