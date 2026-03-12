// ============================================================================
// CONFIGURAÇÕES INICIAIS DO CANVAS E MODOS DE JOGO
// ============================================================================
const canvas = document.getElementById('jogoCanvas');
const ctx = canvas.getContext('2d');
const tamanhoGrade = 32;

// --- FUNÇÃO PARA MANTER O JOGO EM ECRÃ INTEIRO ---
function ajustarTamanhoCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', ajustarTamanhoCanvas);
ajustarTamanhoCanvas(); // Chama imediatamente ao abrir o jogo

// Funções para calcular limites com base no tamanho atual do ecrã
function getMaxColunas() { return Math.floor(canvas.width / tamanhoGrade); }
function getMaxLinhas() { return Math.floor(canvas.height / tamanhoGrade); }

// ============================================================================
// 1. CARREGAMENTO DE IMAGENS (SPRITES E FUNDO)
// ============================================================================
const imgCabeca = new Image(); imgCabeca.src = 'snake_head_nogap.png';
const imgCorpo = new Image(); imgCorpo.src = 'snake_body_nogap.png';
const imgRabo = new Image(); imgRabo.src = 'snake_tail_nogap.png';

const imgComida = new Image(); imgComida.src = 'Comida.png';
const imgFundo = new Image(); imgFundo.src = 'fundo.jfif';

const imgPowerUp = new Image(); imgPowerUp.src = 'Destroyer E (parte-fora).png';
const imgMorte = new Image(); imgMorte.src = 'orb.morte.png';
const imgTempo = new Image(); imgTempo.src = 'orb-tempo.png';
const imgPontosExtra = new Image(); imgPontosExtra.src = 'pontos-extra.png';

// ============================================================================
// 1.5 CARREGAMENTO DE ÁUDIOS
// ============================================================================
const musicaFundo = new Audio('musica.mp3');
musicaFundo.loop = true; musicaFundo.volume = 0.3; 
const somComer = new Audio('comer.mp3'); 
const somPowerUp = new Audio('power-up.mp3'); 
const somGameOver = new Audio('som-de-morte.mp3');
const somMorte = new Audio('som-de-morte.mp3'); 
const somTempo = new Audio('power-up.mp3'); 
const somPontos = new Audio('power-up.mp3'); 
const somVitoria = new Audio('vitoria.mp3'); 

function tocarSom(som) {
    som.currentTime = 0;
    som.play().catch(e => console.log("Áudio a aguardar interação..."));
}
function pararMusica() {
    musicaFundo.pause(); musicaFundo.currentTime = 0;
}

// ============================================================================
// 2. VARIÁVEIS DO JOGO E ITENS ESPECIAIS
// ============================================================================
// AQUI ESTÁ A MUDANÇA: A cobra agora começa só com a cabeça (1 pedaço)!
let cobra = [
    { x: 10, y: 10 }
];
let barraMetal = { x: 0, y: 0 };

let powerUp = { x: -1, y: -1, ativo: false };
let orbMorte = { x: -1, y: -1, ativo: false, timer: null }; 
let orbTempo = { x: -1, y: -1, ativo: false };
let orbPontos = { x: -1, y: -1, ativo: false };

let invencivelTemporario = false; let timerInvencibilidade;
let lentidaoAtiva = false; let timerLentidao;

let pontuacao = 0;
let modoJogo = 'infinito';
let velocidadeOriginal = 150; 
let velocidadeAtual = 150;

let modoDeus = false; let modoAutomatico = false; let modoExtremo = false; 
let dx = 0; let dy = 0; let cicloJogo;

// ============================================================================
// 3. CONTROLOS DO JOGADOR
// ============================================================================
document.addEventListener('keydown', (evento) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(evento.code) > -1) evento.preventDefault();

    if (!modoAutomatico) {
        if (evento.key === 'ArrowUp' && dy !== 1) { dx = 0; dy = -1; }
        if (evento.key === 'ArrowDown' && dy !== -1) { dx = 0; dy = 1; }
        if (evento.key === 'ArrowLeft' && dx !== 1) { dx = -1; dy = 0; }
        if (evento.key === 'ArrowRight' && dx !== -1) { dx = 1; dy = 0; }
    }

    if (evento.key.toLowerCase() === 'g') modoDeus = !modoDeus;
    if (evento.key.toLowerCase() === 'k') modoAutomatico = !modoAutomatico;
    if (evento.key.toLowerCase() === 'h') {
        modoExtremo = !modoExtremo;
        clearInterval(cicloJogo);
        if (modoExtremo) cicloJogo = setInterval(atualizarJogo, 20); 
        else {
            velocidadeAtual = lentidaoAtiva ? velocidadeOriginal + 150 : velocidadeOriginal;
            cicloJogo = setInterval(atualizarJogo, velocidadeAtual);
        }
    }
});

// ============================================================================
// 4. LÓGICA DE SPAWN E INTELIGÊNCIA ARTIFICIAL
// ============================================================================
function sortearComida() {
    let posicaoValida = false;
    while (!posicaoValida) {
        barraMetal.x = Math.floor(Math.random() * getMaxColunas());
        barraMetal.y = Math.floor(Math.random() * getMaxLinhas());
        posicaoValida = true;
        for (let i = 0; i < cobra.length; i++) {
            if (barraMetal.x === cobra[i].x && barraMetal.y === cobra[i].y) { posicaoValida = false; break; }
        }
    }
}

function sortearItem(itemObj) {
    let posicaoValida = false;
    while (!posicaoValida) {
        itemObj.x = Math.floor(Math.random() * getMaxColunas());
        itemObj.y = Math.floor(Math.random() * getMaxLinhas());
        posicaoValida = true;
        for (let i = 0; i < cobra.length; i++) {
            if (itemObj.x === cobra[i].x && itemObj.y === cobra[i].y) { posicaoValida = false; break; }
        }
        if (itemObj.x === barraMetal.x && itemObj.y === barraMetal.y) posicaoValida = false;
    }
    itemObj.ativo = true;
}

function sortearOrbMorte() {
    sortearItem(orbMorte);
    if (orbMorte.timer) clearTimeout(orbMorte.timer);
    orbMorte.timer = setTimeout(() => { orbMorte.ativo = false; }, 5000);
}

function jogarAutomatico() {
    if (!modoAutomatico) return;
    let imortal = modoDeus || invencivelTemporario;
    let cabeca = cobra[0];
    let direcoesPossiveis = [{ nx: 0, ny: -1 }, { nx: 0, ny: 1 }, { nx: -1, ny: 0 }, { nx: 1, ny: 0 }];
    let direcoesSeguras = [];

    function posicaoPerigosa(x, y) {
        if (x < 0 || x >= getMaxColunas() || y < 0 || y >= getMaxLinhas()) {
            if (!imortal) return true;
        }
        for (let i = 0; i < cobra.length - 1; i++) {
            if (x === cobra[i].x && y === cobra[i].y) if (!imortal) return true;
        }
        if (orbMorte.ativo && x === orbMorte.x && y === orbMorte.y) if (!imortal) return true;
        return false;
    }

    for (let d of direcoesPossiveis) {
        if (d.nx === -dx && d.ny === -dy && (dx !== 0 || dy !== 0)) continue;
        let proxX = cabeca.x + d.nx; let proxY = cabeca.y + d.ny;

        if (!posicaoPerigosa(proxX, proxY)) {
            let saidas = 0;
            for (let df of direcoesPossiveis) {
                if (df.nx === -d.nx && df.ny === -d.ny) continue;
                if (!posicaoPerigosa(proxX + df.nx, proxY + df.ny)) saidas++;
            }
            direcoesSeguras.push({ dx: d.nx, dy: d.ny, dist: Math.abs(proxX - barraMetal.x) + Math.abs(proxY - barraMetal.y), saidas: saidas });
        }
    }

    if (direcoesSeguras.length > 0) {
        let seguras = direcoesSeguras.filter(d => d.saidas > 0);
        let final = seguras.length > 0 ? seguras : direcoesSeguras;
        final.sort((a, b) => a.dist - b.dist);
        dx = final[0].dx; dy = final[0].dy;
    }
}

// ============================================================================
// 5. MOTOR DO JOGO
// ============================================================================
function atualizarJogo() {
    jogarAutomatico();
    if (dx === 0 && dy === 0 && !modoAutomatico) { desenharJogo(); return; }

    let novaCabeca = { x: cobra[0].x + dx, y: cobra[0].y + dy };
    let imortal = modoDeus || invencivelTemporario;
    let maxCols = getMaxColunas();
    let maxLins = getMaxLinhas();

    if (novaCabeca.x < 0 || novaCabeca.x >= maxCols || novaCabeca.y < 0 || novaCabeca.y >= maxLins) {
        if (imortal) {
            if (novaCabeca.x < 0) novaCabeca.x = maxCols - 1;
            if (novaCabeca.x >= maxCols) novaCabeca.x = 0;
            if (novaCabeca.y < 0) novaCabeca.y = maxLins - 1;
            if (novaCabeca.y >= maxLins) novaCabeca.y = 0;
        } else {
            pararMusica(); tocarSom(somGameOver);
            alert("Bateu na parede! Game Over.\nPontuação final: " + pontuacao);
            location.reload(); return;
        }
    }

    for (let i = 0; i < cobra.length; i++) {
        if (novaCabeca.x === cobra[i].x && novaCabeca.y === cobra[i].y && !imortal) {
            pararMusica(); tocarSom(somGameOver);
            alert("Colidiu com o próprio corpo! Game Over.\nPontuação final: " + pontuacao);
            location.reload(); return;
        }
    }

    cobra.unshift(novaCabeca);

    if (novaCabeca.x === barraMetal.x && novaCabeca.y === barraMetal.y) {
        tocarSom(somComer); sortearComida(); pontuacao += 10;
        if (pontuacao > 0 && pontuacao % 100 === 0) sortearItem(powerUp);
        if (Math.random() < 0.20 && !orbMorte.ativo) sortearOrbMorte(); 
        if (Math.random() < 0.15 && !orbTempo.ativo) sortearItem(orbTempo);
        if (Math.random() < 0.10 && !orbPontos.ativo) sortearItem(orbPontos);

        if (modoJogo === '1000' && pontuacao >= 1000) {
            pararMusica(); tocarSom(somVitoria); 
            alert("🏆 PARABÉNS! Atingiu 1000 pontos e concluiu a missão!");
            location.reload(); return;
        }
    } else if (!(orbPontos.ativo && novaCabeca.x === orbPontos.x && novaCabeca.y === orbPontos.y)) {
        cobra.pop();
    }

    if (powerUp.ativo && novaCabeca.x === powerUp.x && novaCabeca.y === powerUp.y) {
        tocarSom(somPowerUp); powerUp.ativo = false; invencivelTemporario = true;
        if (timerInvencibilidade) clearTimeout(timerInvencibilidade);
        timerInvencibilidade = setTimeout(() => { invencivelTemporario = false; }, 5000);
    }

    if (orbMorte.ativo && novaCabeca.x === orbMorte.x && novaCabeca.y === orbMorte.y) {
        orbMorte.ativo = false; 
        if (!imortal) {
            pararMusica(); tocarSom(somGameOver); 
            alert("Orbe da Morte! Game Over.\nPontuação final: " + pontuacao);
            location.reload(); return;
        }
    }

    if (orbTempo.ativo && novaCabeca.x === orbTempo.x && novaCabeca.y === orbTempo.y) {
        tocarSom(somPowerUp); orbTempo.ativo = false; lentidaoAtiva = true;
        if (!modoExtremo) {
            clearInterval(cicloJogo);
            velocidadeAtual = velocidadeOriginal + 150;
            cicloJogo = setInterval(atualizarJogo, velocidadeAtual);
        }
        if (timerLentidao) clearTimeout(timerLentidao);
        timerLentidao = setTimeout(() => {
            lentidaoAtiva = false;
            if (!modoExtremo) {
                clearInterval(cicloJogo);
                velocidadeAtual = velocidadeOriginal;
                cicloJogo = setInterval(atualizarJogo, velocidadeAtual);
            }
        }, 5000); 
    }

    if (orbPontos.ativo && novaCabeca.x === orbPontos.x && novaCabeca.y === orbPontos.y) {
        tocarSom(somPowerUp); orbPontos.ativo = false; pontuacao += 50;
        let cauda = cobra[cobra.length - 1];
        for (let p = 0; p < 4; p++) cobra.push({ x: cauda.x, y: cauda.y });
        if (modoJogo === '1000' && pontuacao >= 1000) {
            pararMusica(); tocarSom(somVitoria); 
            alert("🏆 PARABÉNS! Atingiu 1000 pontos e concluiu a missão!");
            location.reload(); return;
        }
    }
    desenharJogo();
}

// ============================================================================
// 6. DESENHAR NO ECRÃ
// ============================================================================
function desenharJogo() {
    let padraoFundo = ctx.createPattern(imgFundo, 'repeat');
    ctx.fillStyle = padraoFundo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(imgComida, barraMetal.x * tamanhoGrade, barraMetal.y * tamanhoGrade, tamanhoGrade, tamanhoGrade);
    if (powerUp.ativo) ctx.drawImage(imgPowerUp, powerUp.x * tamanhoGrade, powerUp.y * tamanhoGrade, tamanhoGrade, tamanhoGrade);
    if (orbMorte.ativo) ctx.drawImage(imgMorte, orbMorte.x * tamanhoGrade, orbMorte.y * tamanhoGrade, tamanhoGrade, tamanhoGrade);
    if (orbTempo.ativo) ctx.drawImage(imgTempo, orbTempo.x * tamanhoGrade, orbTempo.y * tamanhoGrade, tamanhoGrade, tamanhoGrade);
    if (orbPontos.ativo) ctx.drawImage(imgPontosExtra, orbPontos.x * tamanhoGrade, orbPontos.y * tamanhoGrade, tamanhoGrade, tamanhoGrade);

    for (let i = 0; i < cobra.length; i++) {
        let pedaco = cobra[i];
        let imagemAtual = i === 0 ? imgCabeca : (i === cobra.length - 1 ? imgRabo : imgCorpo);
        let angulo = 0;

        if (i === 0) {
            if (dx === 1) angulo = Math.PI / 2;
            else if (dx === -1) angulo = -Math.PI / 2;
            else if (dy === 1) angulo = Math.PI;
            else if (dy === -1) angulo = 0;
        } else {
            let frente = cobra[i - 1];
            let difX = frente.x - pedaco.x; let difY = frente.y - pedaco.y;
            if (difX > 0) angulo = Math.PI / 2;
            else if (difX < 0) angulo = -Math.PI / 2;
            else if (difY > 0) angulo = Math.PI;
            else if (difY < 0) angulo = 0;
        }

        ctx.save();
        ctx.translate(pedaco.x * tamanhoGrade + tamanhoGrade / 2, pedaco.y * tamanhoGrade + tamanhoGrade / 2);
        ctx.rotate(angulo);
        
        // Mantive o truque de alinhamento com os 2 píxeis extra que falámos antes!
        let tamanhoAjustado = tamanhoGrade + 2; 
        
        ctx.drawImage(imagemAtual, -tamanhoAjustado / 2, -tamanhoAjustado / 2, tamanhoAjustado, tamanhoAjustado);
        ctx.restore();
    }

    ctx.fillStyle = "white"; ctx.font = "bold 24px Arial"; ctx.shadowColor = "black"; ctx.shadowBlur = 4;
    ctx.fillText("Pontos: " + pontuacao + " (" + (modoJogo === '1000' ? "Meta: 1000" : "Infinito") + ")", 20, 40);

    let linhaY = 70;
    if (invencivelTemporario) { ctx.fillStyle = "#ff00ff"; ctx.fillText("★ INVENCÍVEL ★", 20, linhaY); linhaY += 30; } 
    else if (modoDeus) { ctx.fillStyle = "yellow"; ctx.fillText("MODO DEUS (G)", 20, linhaY); linhaY += 30; }
    if (modoExtremo) { ctx.fillStyle = "red"; ctx.fillText("⚡ MODO EXTREMO (H)", 20, linhaY); linhaY += 30; }
    if (lentidaoAtiva) { ctx.fillStyle = "#00ffff"; ctx.fillText("❄️ TEMPO LENTO ❄️", 20, linhaY); linhaY += 30; }
    if (modoAutomatico) { ctx.fillStyle = "cyan"; ctx.fillText("BOT ATIVO (K)", 20, linhaY); }
    ctx.shadowBlur = 0;
}

// ============================================================================
// 7. INICIALIZAÇÃO E MENU FUTURISTA
// ============================================================================
let imagensCarregadas = 0;
let escolhaModoTemp = 'infinito'; let escolhaVelTemp = 150;

document.querySelectorAll('.btn-modo').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-modo').forEach(b => b.classList.remove('selecionado'));
        e.target.classList.add('selecionado'); escolhaModoTemp = e.target.getAttribute('data-modo');
    });
});

document.querySelectorAll('.btn-vel').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-vel').forEach(b => b.classList.remove('selecionado'));
        e.target.classList.add('selecionado'); escolhaVelTemp = parseInt(e.target.getAttribute('data-vel'));
    });
});

document.getElementById('btn-iniciar').addEventListener('click', () => {
    document.getElementById('menu-inicial').classList.add('oculto');
    modoJogo = escolhaModoTemp; velocidadeOriginal = escolhaVelTemp; velocidadeAtual = velocidadeOriginal;
    sortearComida();
    musicaFundo.play().catch(e => console.log("Áudio a aguardar interação..."));
    cicloJogo = setInterval(atualizarJogo, velocidadeAtual);
});

function iniciar() {
    imagensCarregadas++;
    if (imagensCarregadas >= 4) { 
        const btnIniciar = document.getElementById('btn-iniciar');
        if (btnIniciar) { btnIniciar.innerText = "INICIAR SEQUÊNCIA"; btnIniciar.disabled = false; }
    }
}

function erroAoCarregar() { console.error("ERRO: Falha ao carregar uma imagem."); iniciar(); }

imgCabeca.onload = iniciar; imgCabeca.onerror = erroAoCarregar;
imgCorpo.onload = iniciar; imgCorpo.onerror = erroAoCarregar;
imgRabo.onload = iniciar; imgRabo.onerror = erroAoCarregar;
imgComida.onload = iniciar; imgComida.onerror = erroAoCarregar;
imgFundo.onload = iniciar; imgFundo.onerror = erroAoCarregar;
imgPowerUp.onload = iniciar; imgPowerUp.onerror = erroAoCarregar;
imgMorte.onload = iniciar; imgMorte.onerror = erroAoCarregar;
imgTempo.onload = iniciar; imgTempo.onerror = erroAoCarregar;
imgPontosExtra.onload = iniciar; imgPontosExtra.onerror = erroAoCarregar;