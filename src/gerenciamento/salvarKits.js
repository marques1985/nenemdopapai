// src/produtos/salvarKits.js
import { supabaseClient } from './supabase.js';

const form = document.querySelector('#form-kit');
const btnAddItemKit = document.querySelector('#btn-add-item-kit');
const containerItensKit = document.querySelector('#container-itens-kit');

let listaDeProdutosCadastrados = [];

// 1. Busca os produtos existentes no banco para carregar nos selects do formulário
async function buscarProdutosParaSelecao() {
    try {
        const { data, error } = await supabaseClient
            .from('produtos')
            .select('id, nome')
            .eq('e_kit', false); // Só traz produtos individuais, não kits dentro de kits

        if (error) throw error;
        listaDeProdutosCadastrados = data;

        // Cria a primeira linha de item assim que os produtos carregarem
        criarLinhaItemKit();
    } catch (err) {
        console.error('Erro ao carregar lista de produtos:', err.message);
    }
}

// 2. Cria uma linha dinâmica com select contendo todos os produtos da loja
function criarLinhaItemKit() {
    if (listaDeProdutosCadastrados.length === 0) {
        alert('Cadastre produtos individuais primeiro antes de montar um kit!');
        return;
    }

    const div = document.createElement('div');
    div.className = 'linha-item-kit';

    div.innerHTML = `
        <div class="form-group" style="margin:0;">
            <label>Selecione o Produto</label>
            <select class="kit-produto-selecionado" required>
                ${listaDeProdutosCadastrados.map(p => `<option value="${p.id}">${p.nome}</option>`).join('')}
            </select>
        </div>
        <div class="form-group" style="margin:0;">
            <label>Qtd inclusa</label>
            <input type="number" class="kit-quantidade" min="1" value="1" required style="width:70px;">
        </div>
        <button type="button" class="btn-remover">X</button>
    `;

    div.querySelector('.btn-remover').addEventListener('click', () => div.remove());
    containerItensKit.appendChild(div);
}

// Ouvintes de eventos de clique
if (btnAddItemKit) {
    btnAddItemKit.addEventListener('click', criarLinhaItemKit);
}

// 3. Processa o salvamento do Kit no Supabase
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.querySelector('#kit-nome').value;
        const descricao = document.querySelector('#kit-descricao').value;
        const preco = document.querySelector('#kit-preco').value;
        const categoriaId = document.querySelector('#kit-categoria').value;
        const generoId = document.querySelector('#kit-genero').value;
        const arquivosFotos = document.querySelector('#kit-fotos').files;
        
        const linhasItens = document.querySelectorAll('.linha-item-kit');

        if (linhasItens.length === 0) {
            alert('Um kit precisa ter pelo menos 1 produto vinculado!');
            return;
        }

        try {
            alert('Salvando combo de produtos. Aguarde...');

            // A. Insere o Kit na tabela principal de produtos marcando 'e_kit' como TRUE
            const { data: novoKit, error: erroKit } = await supabaseClient
                .from('produtos')
                .insert([{
                    nome: nome,
                    descricao: descricao,
                    preco_base: parseFloat(preco),
                    categoria_id: parseInt(categoriaId),
                    genero_id: parseInt(generoId),
                    e_kit: true // Informa ao sistema que isso é um Kit/Combo
                }])
                .select()
                .single();

            if (erroKit) throw new Error(`Erro ao criar cabeçalho do kit: ${erroKit.message}`);
            const kitId = novoKit.id;

            // B. Faz o upload das fotos promocionais do Kit para o Storage
            const dadosImagensKit = [];
            for (let i = 0; i < arquivosFotos.length; i++) {
                const arquivo = arquivosFotos[i];
                const nomeUnico = `${Date.now()}_kit_${i}_${arquivo.name}`;
                
                const { error: erroUpload } = await supabaseClient
                    .storage
                    .from('produtos')
                    .upload(`fotos_gerais/${nomeUnico}`, arquivo);

                if (erroUpload) throw new Error(`Erro no upload da foto do kit: ${erroUpload.message}`);

                const { data: dadosUrl } = supabaseClient
                    .storage
                    .from('produtos')
                    .getPublicUrl(`fotos_gerais/${nomeUnico}`);

                dadosImagensKit.push({
                    produto_id: kitId,
                    url_imagem: dadosUrl.publicUrl
                });
            }

            // Salva as fotos na tabela de imagens gerais
            const { error: erroImagens } = await supabaseClient
                .from('produtos_imagens_gerais')
                .insert(dadosImagensKit);

            if (erroImagens) throw new Error(`Erro ao vincular fotos do kit: ${erroImagens.message}`);

            // C. Salva a relação de quais itens compõem esse Kit na tabela 'kit_itens'
            const dadosItensDoKitParaInserir = [];
            
            linhasItens.forEach(linha => {
                const produtoSelecionadoId = linha.querySelector('.kit-produto-selecionado').value;
                const quantidade = linha.querySelector('.kit-quantidade').value;

                dadosItensDoKitParaInserir.push({
                    kit_produto_id: kitId,
                    item_produto_id: parseInt(produtoSelecionadoId),
                    quantidade: parseInt(quantidade)
                });
            });

            const { error: erroItensKit } = await supabaseClient
                .from('kit_itens')
                .insert(dadosItensDoKitParaInserir);

            if (erroItensKit) throw new Error(`Erro ao estruturar a composição do kit: ${erroItensKit.message}`);

            alert('🎉 Kit promocional montado e salvo com total sucesso!');
            containerItensKit.innerHTML = '';
            form.reset();
            buscarProdutosParaSelecao(); // Recarrega a tela limpa

        } catch (error) {
            console.error(error);
            alert(`⚠️ Falha ao criar kit: ${error.message}`);
        }
    });
}

// Inicializa a página buscando os produtos do banco
buscarProdutosParaSelecao();