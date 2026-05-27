// src/produtos/carrinho.js

function obtenerDadosCarrinho() {
    try {
        const dados = localStorage.getItem("dadosCarrinho");
        return dados ? JSON.parse(dados) : [];
    } catch (e) {
        console.error("Erro ao ler localStorage:", e);
        return [];
    }
}

let dadosCarrinho = obtenerDadosCarrinho();

function renderizarCarrinho() {
    const principal = document.querySelector("main") || document.querySelector("section") || document.body;
    const headerElement = document.querySelector("header") || document.querySelector("nav") || document.querySelector(".header") || principal.firstChild;

    let containerProdutos = document.getElementById("itensCarrinho") || document.querySelector(".itens-carrinho");

    if (!containerProdutos) {
        containerProdutos = document.createElement("div");
        containerProdutos.id = "itensCarrinho";
        containerProdutos.className = "itens-carrinho";
        principal.insertBefore(containerProdutos, headerElement.nextSibling);
    }

    let containerResumo = document.getElementById("resumoCompra") || document.querySelector(".resumo-compra");

    if (!containerResumo) {
        containerResumo = document.createElement("div");
        containerResumo.id = "resumoCompra";
        containerResumo.className = "resumo-compra";
        principal.appendChild(containerResumo);
    }

    containerProdutos.innerHTML = "";

    if (dadosCarrinho.length === 0) {
        containerProdutos.innerHTML = `
            <div class="carrinho-vazio-box">
                <p>Seu carrinho está vazio.</p>
            </div>
        `;
        renderizarEstruturaResumo(containerResumo, 0);
        const badgeContador = document.getElementById("quantidadeCarrinho") || document.querySelector(".badge-contador");
        if (badgeContador) badgeContador.textContent = 0;
        return;
    }

    dadosCarrinho.forEach((item, index) => {
        const precoUnitario = Number(item.preco) || 0;
        const precoTotalItem = precoUnitario * item.quantidade;

        let textoVariacoes = "";
        if (item.cor || item.tamanho) {
            const partes = [];
            if (item.cor) partes.push(`Cor: ${item.cor}`);
            if (item.tamanho) partes.push(`Tam: ${item.tamanho}`);
            textoVariacoes = partes.join(" - ");
        } else if (item.detalheVariacao) {
            textoVariacoes = item.detalheVariacao;
        }

        const elementoItem = document.createElement("div");
        elementoItem.className = "item-carrinho-row";

        elementoItem.innerHTML = `
            <div class="prod-img-box">
                <img src="${item.imagem || 'https://via.placeholder.com/75'}" alt="${item.nome || 'Produto'}">
            </div>

            <div class="prod-detalhes-wrapper">
                <div class="prod-info-text">
                    <h4>${item.nome || 'Produto'}</h4>
                    ${textoVariacoes ? `<span class="prod-variacao">${textoVariacoes}</span>` : ''}
                </div>

                <div class="prod-controles-valores">
                    <span class="prod-preco-unit">R$ ${precoUnitario.toFixed(2).replace('.', ',')}</span>

                    <div class="prod-seletor-qtd">
                        <button class="btn-diminuir" data-index="${index}">-</button>
                        <span class="qtd-numero">${item.quantidade}</span>
                        <button class="btn-aumentar" data-index="${index}">+</button>
                    </div>

                    <div class="prod-preco-total">
                        R$ ${precoTotalItem.toFixed(2).replace('.', ',')}
                    </div>
                </div>
            </div>
        `;
        containerProdutos.appendChild(elementoItem);
    });

    const totalCalculado = dadosCarrinho.reduce((acc, item) => acc + (Number(item.preco) * item.quantidade), 0);
    renderizarEstruturaResumo(containerResumo, totalCalculado);

    const totalItens = dadosCarrinho.reduce((acc, item) => acc + item.quantidade, 0);
    const badgeContador = document.getElementById("quantidadeCarrinho") || document.querySelector(".badge-contador");
    if (badgeContador) {
        badgeContador.textContent = totalItens;
    }

    adicionarEventosBotoes();
}

function renderizarEstruturaResumo(elementoResumo, total) {
    const totalFormatado = `R$ ${total.toFixed(2).replace('.', ',')}`;

    elementoResumo.innerHTML = `
        <h3 class="resumo-titulo">Resumo da compra</h3>
        <div class="resumo-linha"><span>Subtotal</span><strong>${totalFormatado}</strong></div>
        <div class="resumo-linha-frete"><span>Frete</span><span class="frete-gratis">Grátis</span></div>
        <div class="resumo-linha-total">
            <span>Total:</span>
            <div class="total-valores-bloco">
                <div class="total-bold">${totalFormatado}</div>
                <div class="total-pix">${totalFormatado} com PIX</div>
            </div>
        </div>
        <button class="btn-finalizar">Finalizar compra</button>
        <button onclick="window.location.href='index.html'" class="btn-continuar">Continuar comprando</button>
    `;
}

function adicionarEventosBotoes() {
    document.querySelectorAll(".btn-aumentar").forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const index = btn.getAttribute("data-index");
            dadosCarrinho[index].quantidade += 1;
            salvarERenderizar();
        };
    });

    document.querySelectorAll(".btn-diminuir").forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const index = btn.getAttribute("data-index");
            if (dadosCarrinho[index].quantidade > 1) {
                dadosCarrinho[index].quantidade -= 1;
            } else {
                dadosCarrinho.splice(index, 1);
            }
            salvarERenderizar();
        };
    });
}

function salvarERenderizar() {
    try { localStorage.setItem("dadosCarrinho", JSON.stringify(dadosCarrinho)); } catch (e) {}
    renderizarCarrinho();
    window.dispatchEvent(new Event('storage'));
}

if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", renderizarCarrinho); } else { renderizarCarrinho(); }