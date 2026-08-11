let hiddenHoles = [];
let players = [];

function generateHidden() {
  hiddenHoles = [];
  while (hiddenHoles.length < 9) {
    const h = Math.floor(Math.random() * 18) + 1;
    if (!hiddenHoles.includes(h)) hiddenHoles.push(h);
  }

  document.getElementById("hiddenResult").innerText =
    "隠しホール: " + hiddenHoles.join(", ");

  // PAR入力欄を生成
  const parDiv = document.getElementById("parInputs");
  parDiv.innerHTML = "";
  hiddenHoles.forEach((h, i) => {
    parDiv.innerHTML += `H${h} PAR: <input id="par_${i}" type="number" value="4" style="width:50px;"> `;
  });
}

function addPlayer() {
  if (players.length >= 10) return alert("最大10名までです");

  const id = players.length;
  players.push({ name: "", scores: Array(18).fill(0) });

  const div = document.createElement("div");
  div.className = "player";
  div.id = "player_" + id;

  div.innerHTML = `
    <h4>プレーヤー${id + 1}</h4>
    名前: <input onchange="setName(${id}, this.value)">
    <br><br>
    ${Array.from({ length: 18 }).map((_, i) =>
      `H${i + 1}: <input type="number" style="width:50px;"
       onchange="setScore(${id}, ${i}, this.value)">`
    ).join(" ")}
  `;

  document.getElementById("players").appendChild(div);
}

function setName(id, name) {
  players[id].name = name;
}

function setScore(id, hole, value) {
  players[id].scores[hole] = Number(value);
}

function calculate() {
  if (hiddenHoles.length === 0) return alert("隠しホールを生成してください");

  // 隠しホールのPAR取得
  const hiddenPars = hiddenHoles.map((_, i) =>
    Number(document.getElementById(`par_${i}`).value)
  );

  const results = players.map(p => {
    const hiddenScores = hiddenHoles.map(h => p.scores[h - 1]);

    const scoreTotal = hiddenScores.reduce((a, b) => a + b, 0);
    const parTotal = hiddenPars.reduce((a, b) => a + b, 0);

    const overPar = scoreTotal - parTotal;

    const hdcp = overPar * 1.6;
    const gross = p.scores.reduce((a, b) => a + b, 0);
    const net = gross - hdcp;

    return {
      name: p.name,
      gross,
      hdcp: hdcp.toFixed(1),
      net: net.toFixed(1)
    };
  });

  results.sort((a, b) => a.net - b.net);

  const table = document.getElementById("resultTable");
  table.innerHTML = `
    <tr><th>順位</th><th>名前</th><th>グロス</th><th>ハンディ</th><th>ネット</th></tr>
    ${results.map((r, i) =>
      `<tr>
        <td>${i + 1}</td>
        <td>${r.name}</td>
        <td>${r.gross}</td>
        <td>${r.hdcp}</td>
        <td>${r.net}</td>
      </tr>`
    ).join("")}
  `;
}
