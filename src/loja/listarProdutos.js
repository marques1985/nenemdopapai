// src/produtos/listarProdutos.js
import { supabaseClient } from '../supabase.js';

// Inicializa o carrinho lendo o localStorage ou cria um array vazio se não houver nada salvo
let carrinho = JSON.parse(localStorage.getItem("dadosCarrinho")) || [];

async function renderizarProdutos() {
    try {
        const { data: produtos, error } = await supabaseClient
            .from('produtos')
            .select(`
                id, nome, descricao, preco_base, e_kit,
                categorias ( nome ),
                generos ( nome ),
                produtos_imagens_gerais ( url_imagem ),
                variacoes_estoque (
                    id, cor, quantidade_estoque, imagem_da_cor,
                    tamanhos ( nome )
                )
            `);

        if (error) throw error;

        const container = document.querySelector('#loja');
        if (!container) return;
        
        container.innerHTML = ''; 

        produtos.forEach(produto => {
            // 1. EXTRAÇÃO E PADRONIZAÇÃO RIGOROSA DAS URLs PARA EVITAR DUPLICADOS
            const mapearEFiltrarUrl = (url) => {
                if (!url) return '';
                // Limpa espaços, padroniza em minúsculas e remove a barra de fechamento "/" se existir
                return url.trim().toLowerCase().replace(/\/$/, '');
            };

            const listaCruaImagens = [];

            // Adiciona as imagens gerais padronizadas
            produto.produtos_imagens_gerais.forEach(img => {
                if (img.url_imagem) listaCruaImagens.push(img.url_imagem.trim());
            });

            // Adiciona as imagens das variações padronizadas
            produto.variacoes_estoque.forEach(v => {
                if (v.imagem_da_cor) listaCruaImagens.push(v.imagem_da_cor.trim());
            });

            // O filtro 'Set' compara os links limpos. Usamos o mapeamento para garantir igualdade exata.
            const chavesUnicas = new Set();
            const todasImagens = [];

            listaCruaImagens.forEach(urlOriginal => {
                const urlPadrao = mapearEFiltrarUrl(urlOriginal);
                if (urlPadrao && !chavesUnicas.has(urlPadrao)) {
                    chavesUnicas.add(urlPadrao);
                    todasImagens.push(urlOriginal); // Mantém a URL original para carregar a imagem corretamente
                }
            });

            // Se o produto não tiver nenhuma imagem, adiciona o placeholder padrão
            if (todasImagens.length === 0) {
                todasImagens.push('https://via.placeholder.com/220x220?text=Sem+Foto');
            }

            const tamanhosDisponiveis = [...new Set(produto.variacoes_estoque.map(v => v.tamanhos?.nome))];

            const card = document.createElement('div');
            card.className = 'item'; 
            card.id = `produto-id-${produto.id}`;

            // Lógica do Ver Mais para a descrição
            const descricaoCompleta = produto.descricao || '';
            const limiteCaracteres = 45; 
            let descricaoHTML = '';
            
            if (descricaoCompleta.length > limiteCaracteres) {
                const textoCortado = descricaoCompleta.substring(0, limiteCaracteres) + '...';
                descricaoHTML = `
                    <span class="texto-descricao">${textoCortado}</span>
                    <button class="btn-ver-mais" style="background: none; border: none; color: #007bff; font-size: 12px; cursor: pointer; padding: 0; font-weight: bold; margin-left: 5px;">Ver mais</button>
                `;
            } else {
                descricaoHTML = `<span class="texto-descricao">${descricaoCompleta}</span>`;
            }

            // HTML estruturado do Card
            card.innerHTML = `
                <div class="container-carrossel" style="position: relative; width: 100%; height: 220px; overflow: hidden; background-color: #f8f9fa; border-radius: 2px 2px 0 0;">
                    <button class="seta-carrossel seta-esquerda" style="position: absolute; top: 50%; left: 8px; transform: translateY(-50%); background: rgba(255,255,255,0.8); border: none; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 2; box-shadow: 0 1px 4px rgba(0,0,0,0.2);"><i class="bi bi-chevron-left" style="color: #212529; font-weight: bold; font-size: 14px;"></i></button>
                    
                    <img class="imagem-produto-carrossel" src="${todasImagens[0]}" alt="${produto.nome}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; transition: opacity 0.15s ease;">
                    
                    <button class="seta-carrossel seta-direita" style="position: absolute; top: 50%; right: 8px; transform: translateY(-50%); background: rgba(255,255,255,0.8); border: none; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 2; box-shadow: 0 1px 4px rgba(0,0,0,0.2);"><i class="bi bi-chevron-right" style="color: #212529; font-weight: bold; font-size: 14px;"></i></button>
                
                    <div class="indicadores-pontos" style="position: absolute; bottom: 10px; left: 0; right: 0; display: flex; justify-content: center; gap: 6px; z-index: 2;">
                        ${todasImagens.map((_, i) => `<span class="ponto-dot" data-index="${i}" style="width: 8px; height: 8px; background: rgba(255,255,255,0.4); border-radius: 50%; transition: all 0.2s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.3); cursor: pointer;"></span>`).join('')}
                    </div>
                </div>

                <div class="detalhes">
                    <h3>${produto.nome}</h3>
                    <p class="container-descricao" style="font-size: 13px; color: #666; margin: 0; min-height: 32px;">
                        ${descricaoHTML}
                    </p>
                    
                    <div class="preco-whitespace" style="display:flex; flex-direction:column; gap:5px;">
                        <select class="seletor-tamanho-carrinho" style="padding: 3px; font-size: 12px; border-radius:3px;">
                            ${produto.variacoes_estoque.map(v => `<option value="${v.id}">Cor: ${v.cor} - Tam: ${v.tamanhos?.nome || 'Único'}</option>`).join('')}
                        </select>
                    </div>

                    <div class="preco-whitespace" style="display: flex; justify-content: space-between; align-items: center;">
                        <h2>R$ ${Number(produto.preco_base).toFixed(2).replace('.', ',')}</h2>
                        <div class="botoes">
                            <i class="bi bi-plus-lg btn-adicionar-carrinho" style="font-size: 20px;" title="Adicionar ao carrinho"></i>
                        </div>
                    </div>
                    
                    <div style="font-size: 11px; color: #888; border-top: 1px dashed #ddd; padding-top: 5px;">
                        <strong>Tamanhos:</strong> ${tamanhosDisponiveis.join(', ') || 'Único'}
                    </div>
                </div>
            `;

            // --- LÓGICA DO CARROSSEL E PONTINHOS SEM LOOP ---
            let indexImagemAtual = 0;
            const tagImagem = card.querySelector('.imagem-produto-carrossel');
            const btnEsquerda = card.querySelector('.seta-esquerda');
            const btnDireita = card.querySelector('.seta-direita');
            const pontos = card.querySelectorAll('.ponto-dot');

            function atualizarVisualCarrossel() {
                pontos.forEach((ponto, i) => {
                    if (i === indexImagemAtual) {
                        ponto.style.background = '#ffffff'; 
                        ponto.style.transform = 'scale(1.2)'; 
                    } else {
                        ponto.style.background = 'rgba(255, 255, 255, 0.4)'; 
                        ponto.style.transform = 'scale(1)';
                    }
                });

                if (indexImagemAtual === 0) {
                    btnEsquerda.style.visibility = 'hidden'; 
                } else {
                    btnEsquerda.style.visibility = 'visible';
                }

                if (indexImagemAtual === todasImagens.length - 1) {
                    btnDireita.style.visibility = 'hidden'; 
                } else {
                    btnDireita.style.visibility = 'visible';
                }
            }

            function atualizarFotoCarrossel() {
                tagImagem.style.opacity = '0.5';
                setTimeout(() => {
                    tagImagem.src = todasImagens[indexImagemAtual];
                    tagImagem.style.opacity = '1';
                    atualizarVisualCarrossel();
                }, 80);
            }

            if (todasImagens.length <= 1) {
                btnEsquerda.style.display = 'none';
                btnDireita.style.display = 'none';
                if(pontos[0]) pontos[0].style.display = 'none';
            }

            atualizarVisualCarrossel();

            btnEsquerda.addEventListener('click', (e) => {
                e.stopPropagation();
                if (indexImagemAtual > 0) { 
                    indexImagemAtual--;
                    atualizarFotoCarrossel();
                }
            });

            btnDireita.addEventListener('click', (e) => {
                e.stopPropagation();
                if (indexImagemAtual < todasImagens.length - 1) { 
                    indexImagemAtual++;
                    atualizarFotoCarrossel();
                }
            });

            pontos.forEach(ponto => {
                ponto.addEventListener('click', (e) => {
                    e.stopPropagation();
                    indexImagemAtual = parseInt(ponto.getAttribute('data-index'));
                    atualizarFotoCarrossel();
                });
            });

            const seletorElemento = card.querySelector('.seletor-tamanho-carrinho');
            seletorElemento.addEventListener('change', () => {
                const variacaoSelecionadaId = seletorElemento.value;
                const variacaoObjeto = produto.variacoes_estoque.find(v => v.id == variacaoSelecionadaId);
                
                if (variacaoObjeto && variacaoObjeto.imagem_da_cor) {
                    const urlAlvoPadrao = mapearEFiltrarUrl(variacaoObjeto.imagem_da_cor);
                    
                    // Procura o índice correto mapeando as imagens reais do carrossel
                    const indiceDaCor = todasImagens.findIndex(imgUrl => mapearEFiltrarUrl(imgUrl) === urlAlvoPadrao);
                    
                    if (indiceDaCor !== -1) {
                        indexImagemAtual = indiceDaCor;
                        atualizarFotoCarrossel();
                    }
                }
            });

            // --- EVENTOS DE COMPRA E VER MAIS ---
            const btnVerMais = card.querySelector('.btn-ver-mais');
            if (btnVerMais) {
                btnVerMais.addEventListener('click', () => {
                    const labelTexto = card.querySelector('.texto-descricao');
                    if (btnVerMais.textContent === 'Ver mais') {
                        labelTexto.textContent = descricaoCompleta;
                        btnVerMais.textContent = 'Ver menos';
                    } else {
                        const textoCortado = descricaoCompleta.substring(0, limiteCaracteres) + '...';
                        labelTexto.textContent = textoCortado;
                        btnVerMais.textContent = 'Ver mais';
                    }
                });
            }

            const btnAdicionar = card.querySelector('.btn-adicionar-carrinho');
            btnAdicionar.addEventListener('click', () => {
                const variacaoSelecionadaId = seletorElemento.value;
                const textoVariacao = seletorElemento.options[seletorElemento.selectedIndex].text;
                const imagemParaSalvar = tagImagem.src;

                const itemExistente = carrinho.find(item => item.variacaoId === variacaoSelecionadaId);

                if (itemExistente) {
                    itemExistente.quantidade += 1;
                } else {
                    carrinho.push({
                        produtoId: produto.id,
                        variacaoId: variacaoSelecionadaId,
                        nome: produto.nome,
                        preco: produto.preco_base,
                        imagem: imagemParaSalvar,
                        detalheVariacao: textoVariacao,
                        quantidade: 1
                    });
                }

                localStorage.setItem("dadosCarrinho", JSON.stringify(carrinho));
                atualizarNumeroCarrinhoNav();
            });

            container.appendChild(card);
        });

        atualizarNumeroCarrinhoNav();

    } catch (err) {
        console.error('Erro ao renderizar a vitrine de produtos:', err.message);
    }
}

function atualizarNumeroCarrinhoNav() {
    const badge = document.querySelector('#quantidadeCarrinho');
    if (!badge) return;
    
    const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0);
    badge.textContent = totalItens;
}

document.addEventListener('DOMContentLoaded', renderizarProdutos);