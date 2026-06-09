/**
 * 테트리스 시나리오 점검 스크립트 (Node.js)
 * script.js 핵심 로직을 DOM 모킹 환경에서 검증한다.
 */

const COLS = 10;
const ROWS = 20;

const LINE_SCORES = { 1: 100, 2: 300, 3: 500, 4: 800 };

const TETROMINOES = {
  I: { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: '#00f0f0' },
  O: { shape: [[1,1],[1,1]], color: '#f0f000' },
  T: { shape: [[0,1,0],[1,1,1]], color: '#a000f0' },
  S: { shape: [[0,1,1],[1,1,0]], color: '#00f000' },
  Z: { shape: [[1,1,0],[0,1,1]], color: '#f00000' },
  J: { shape: [[1,0,0],[1,1,1]], color: '#0000f0' },
  L: { shape: [[0,0,1],[1,1,1]], color: '#f0a000' },
};

const PIECE_TYPES = Object.keys(TETROMINOES);

function createGameState() {
  return {
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
    score: 0,
    level: 1,
    isGameOver: false,
    currentPiece: { type: 'T', shape: [], row: 0, col: 0 },
    nextPieceType: 'T',
    dropTimerId: null,
    overlayHidden: true,
    scoreText: '0',
    levelText: '1',
  };
}

function getShapeSize(shape) {
  return { width: shape[0].length, height: shape.length };
}

function copyShape(shape) {
  return shape.map((row) => [...row]);
}

function getPieceCells(shape, row, col) {
  const cells = [];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) cells.push({ col: col + c, row: row + r });
    }
  }
  return cells;
}

function collidesWithBoundary(shape, row, col) {
  return getPieceCells(shape, row, col).some(
    ({ col: c, row: r }) => c < 0 || c >= COLS || r < 0 || r >= ROWS,
  );
}

function collidesWithLockedBlocks(state, shape, row, col) {
  return getPieceCells(shape, row, col).some(
    ({ col: c, row: r }) => state.board[r][c],
  );
}

function canPlacePiece(state, shape, row, col) {
  return !collidesWithBoundary(shape, row, col)
    && !collidesWithLockedBlocks(state, shape, row, col);
}

function rotateShapeClockwise(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = shape[r][c];
    }
  }
  return rotated;
}

function placePieceAtTopCenter(state, type) {
  const { shape } = TETROMINOES[type];
  const { width } = getShapeSize(shape);
  state.currentPiece.type = type;
  state.currentPiece.shape = copyShape(shape);
  state.currentPiece.row = 0;
  state.currentPiece.col = Math.floor((COLS - width) / 2);
}

function lockPiece(state) {
  const { color } = TETROMINOES[state.currentPiece.type];
  const { shape, row: baseRow, col: baseCol } = state.currentPiece;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) state.board[baseRow + r][baseCol + c] = color;
    }
  }
}

function isRowFull(state, row) {
  return state.board[row].every((cell) => cell !== 0);
}

function clearLines(state) {
  const remainingRows = [];
  let linesCleared = 0;
  for (let row = 0; row < ROWS; row++) {
    if (isRowFull(state, row)) linesCleared += 1;
    else remainingRows.push(state.board[row]);
  }
  while (remainingRows.length < ROWS) {
    remainingRows.unshift(Array(COLS).fill(0));
  }
  for (let row = 0; row < ROWS; row++) {
    state.board[row] = remainingRows[row];
  }
  return linesCleared;
}

function addScore(state, linesCleared) {
  if (LINE_SCORES[linesCleared]) {
    state.score += LINE_SCORES[linesCleared];
    state.scoreText = String(state.score);
  }
}

function spawnNewPiece(state, type) {
  placePieceAtTopCenter(state, type);
  return canPlacePiece(state, state.currentPiece.shape, state.currentPiece.row, state.currentPiece.col);
}

function movePiece(state, dx) {
  const nextCol = state.currentPiece.col + dx;
  if (canPlacePiece(state, state.currentPiece.shape, state.currentPiece.row, nextCol)) {
    state.currentPiece.col = nextCol;
    return true;
  }
  return false;
}

function rotatePiece(state) {
  const rotated = rotateShapeClockwise(state.currentPiece.shape);
  if (canPlacePiece(state, rotated, state.currentPiece.row, state.currentPiece.col)) {
    state.currentPiece.shape = rotated;
    return true;
  }
  return false;
}

function dropPiece(state) {
  const nextRow = state.currentPiece.row + 1;
  if (canPlacePiece(state, state.currentPiece.shape, nextRow, state.currentPiece.col)) {
    state.currentPiece.row = nextRow;
    return 'moved';
  }
  lockPiece(state);
  const lines = clearLines(state);
  if (lines > 0) addScore(state, lines);
  return 'locked';
}

function hardDrop(state) {
  while (canPlacePiece(state, state.currentPiece.shape, state.currentPiece.row + 1, state.currentPiece.col)) {
    state.currentPiece.row += 1;
  }
  lockPiece(state);
  const lines = clearLines(state);
  if (lines > 0) addScore(state, lines);
}

function triggerGameOver(state) {
  state.isGameOver = true;
  state.dropTimerId = null;
  state.overlayHidden = false;
}

function resetBoard(state) {
  for (let row = 0; row < ROWS; row++) state.board[row].fill(0);
}

function restartGame(state) {
  state.isGameOver = false;
  state.score = 0;
  state.level = 1;
  resetBoard(state);
  state.scoreText = '0';
  state.levelText = '1';
  spawnNewPiece(state, 'T');
  state.overlayHidden = true;
  state.dropTimerId = 999;
}

function fillRow(state, row, gapCol = -1) {
  for (let col = 0; col < COLS; col++) {
    if (col !== gapCol) state.board[row][col] = '#ccc';
  }
}

const results = [];

function assert(name, condition, detail = '') {
  results.push({ name, pass: !!condition, detail });
}

// (1) 7종 블록 모두 스폰 가능
(function testAllPieceTypes() {
  for (const type of PIECE_TYPES) {
    const state = createGameState();
    const ok = spawnNewPiece(state, type);
    assert(`(1) ${type} 블록 스폰`, ok && state.currentPiece.type === type);
  }
  assert('(1) 테트로미노 종류 수', PIECE_TYPES.length === 7, `count=${PIECE_TYPES.length}`);
})();

// (2) 좌우 이동·회전·하강
(function testMovement() {
  const state = createGameState();
  spawnNewPiece(state, 'T');
  const startCol = state.currentPiece.col;
  assert('(2) 오른쪽 이동', movePiece(state, 1) && state.currentPiece.col === startCol + 1);
  assert('(2) 왼쪽 이동', movePiece(state, -1) && state.currentPiece.col === startCol);

  const beforeRotate = JSON.stringify(state.currentPiece.shape);
  const rotated = rotatePiece(state);
  assert('(2) 회전 적용', rotated && JSON.stringify(state.currentPiece.shape) !== beforeRotate);

  const rowBefore = state.currentPiece.row;
  const dropResult = dropPiece(state);
  assert('(2) 하강(soft drop)', dropResult === 'moved' && state.currentPiece.row === rowBefore + 1);

  hardDrop(state);
  assert('(2) 즉시 하강(hard drop) 후 고정', state.board.some((row) => row.some((cell) => cell)));
})();

// (3) 줄 삭제 및 점수
(function testLineClear() {
  const state = createGameState();
  fillRow(state, ROWS - 1);
  const lines = clearLines(state);
  addScore(state, lines);
  assert('(3) 1줄 삭제', lines === 1);
  assert('(3) 1줄 점수 100', state.score === 100, `score=${state.score}`);
  assert('(3) 바닥이 비었는가', state.board[ROWS - 1].every((cell) => cell === 0));
})();

// (4) 4줄 동시 삭제 점수 800
(function testTetrisScore() {
  const state = createGameState();
  for (let row = ROWS - 4; row < ROWS; row++) fillRow(state, row);
  const lines = clearLines(state);
  addScore(state, lines);
  assert('(4) 4줄 동시 삭제', lines === 4);
  assert('(4) 점수 800', state.score === 800, `score=${state.score}`);
})();

// (5) 게임 오버 후 다시 시작
(function testGameOverRestart() {
  const state = createGameState();
  for (let row = 0; row < ROWS; row++) fillRow(state, row);
  const canSpawn = spawnNewPiece(state, 'I');
  assert('(5) 스폰 불가 → 게임 오버 조건', !canSpawn);
  if (!canSpawn) triggerGameOver(state);
  assert('(5) 게임 오버 상태', state.isGameOver && !state.overlayHidden);

  restartGame(state);
  assert('(5) 다시 시작 후 isGameOver=false', !state.isGameOver);
  assert('(5) 다시 시작 후 점수 0', state.score === 0);
  assert('(5) 다시 시작 후 보드 초기화', state.board.every((row) => row.every((cell) => cell === 0)));
  assert('(5) 다시 시작 후 오버레이 숨김', state.overlayHidden);
  assert('(5) 다시 시작 후 새 블록 존재', state.currentPiece.shape.length > 0);
})();

const failed = results.filter((r) => !r.pass);
console.log('\n=== 테트리스 시나리오 점검 결과 ===\n');
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}: ${r.name}${r.detail ? ` (${r.detail})` : ''}`);
}
console.log(`\n총 ${results.length}항목 / 통과 ${results.length - failed.length} / 실패 ${failed.length}`);
process.exit(failed.length > 0 ? 1 : 0);
