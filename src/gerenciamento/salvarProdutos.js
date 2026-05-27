// src/gerenciamento/salvarProdutos.js
import { supabaseClient } from '../supabase.js';

const form = document.querySelector('#form-produto');
const btnAddVariacao = document.querySelector('#btn-add-variacao');
const containerVariacoes = document.querySelector('#container-linhas-variacao');

const opcoesTamanhos = [
    { id: 1, nome: "0 a 3 meses" }, { id: 2, nome: "3 a 6 meses" },
    { id: 3, nome: "6 a 9 meses" }, { id: 4, nome: "9 a 12 meses" },
    { id: 5, nome: "1 ano" },       { id: 6, nome: "2 anos" },
    { id: 7, nome: "3 anos" },      { id: 8, nome: "4 anos" },
    { id: 9, nome: "5 anos" },      { id: 10, nome: "6 anos" },
    { id: 11, nome: "7 anos" },     { id: 12, nome: "8 anos" },
    { id: 13, nome: "9 anos" },     { id: 14, nome: "10 anos" },
    { id: 15, nome: "11 anos" },    { id: 16, nome: "12 anos" }
];

function criarLinhaVariacao() {
    const div = document.createElement('div');
    div.className = 'linha-variacao';

    div.innerHTML = `
        <div class="form-group" style="margin:0;">
            <label>Cor</label>
            <input type="text" class="var-cor" required placeholder="Ex: Azul">
        </div>
        <div class="form-group" style="margin:0;">
            <label>Tamanho</label>
            <select class="var-tamanho" required>
                ${opcoesTamanhos.map(t => `<option value="${t.id}">${t.nome}</option>`).join('')}
            </select>
        </div>
        <div class="form-group" style="margin:0;">
            <label>Estoque</label>
            <input type="number" class="var-estoque" min="0" required placeholder="0" style="width:60px;">
        </div>
        <div class="form-group" style="margin:0;">
            <label>Foto desta Cor</label>
            <input type="file" class="var-foto" accept="image/*" required>
        </div>
        <button type="button" class="btn-remover">X</button>
    `;

    div.querySelector('.btn-remover').addEventListener('click', () => div.remove());
    containerVariacoes.appendChild(div);
}

if (btnAddVariacao) {
    btnAddVariacao.addEventListener('click', criarLinhaVariacao);
    criarLinhaVariacao(); 
}

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.querySelector('#nome').value;
        const descricao = document.querySelector('#descricao').value;
        const preco = document.querySelector('#preco').value;
        const categoriaId = document.querySelector('#categoria').value;
        const generoId = document.querySelector('#genero').value;
        
        // Pega a lista de arquivos das fotos principais
        const arquivosFotosPrincipais = document.querySelector('#fotos-principais').files;
        const linhas = document.querySelectorAll('.linha-variacao');

        if (linhas.length === 0) {
            alert('Por favor, adicione pelo menos uma variação!');
            return;
        }

        try {
            alert('Enviando dados e imagens para o Supabase. Por favor, aguarde...');

            // 1. Cadastrar primeiro o produto principal para gerar o ID
            const { data: novoProduto, error: erroProduto } = await supabaseClient
                .from('produtos')
                .insert([{
                    nome: nome,
                    descricao: descricao,
                    preco_base: parseFloat(preco),
                    categoria_id: parseInt(categoriaId),
                    genero_id: parseInt(generoId),
                    e_kit: false
                }])
                .select()
                .single();

            if (erroProduto) throw new Error(`Erro ao salvar produto: ${erroProduto.message}`);
            const produtoId = novoProduto.id;

            // 2. Processar e fazer upload de todas as Fotos Principais/Mistas (Loop)
            const dadosImagensGerais = [];
            
            for (let i = 0; i < arquivosFotosPrincipais.length; i++) {
                const arquivo = arquivosFotosPrincipais[i];
                const nomeUnico = `${Date.now()}_geral_${i}_${arquivo.name}`;
                
                const { error: erroUploadGeral } = await supabaseClient
                    .storage
                    .from('produtos')
                    .upload(`fotos_gerais/${nomeUnico}`, arquivo);

                if (erroUploadGeral) throw new Error(`Erro no upload da foto geral: ${erroUploadGeral.message}`);

                const { data: dadosUrl } = supabaseClient
                    .storage
                    .from('produtos')
                    .getPublicUrl(`fotos_gerais/${nomeUnico}`);

                dadosImagensGerais.push({
                    produto_id: produtoId,
                    url_imagem: dadosUrl.publicUrl
                });
            }

            // Insere todas as fotos vinculadas na tabela de imagens gerais
            const { error: erroInserirImagens } = await supabaseClient
                .from('produtos_imagens_gerais')
                .insert(dadosImagensGerais);

            if (erroInserirImagens) throw new Error(`Erro ao vincular fotos gerais: ${erroInserirImagens.message}`);

            // 3. Processar e fazer upload das Fotos de Variação de Cor e salvar os estoques
            const dadosVariacoesParaInserir = [];

            for (let i = 0; i < linhas.length; i++) {
                const linha = linhas[i];
                const cor = linha.querySelector('.var-cor').value;
                const tamanhoId = linha.querySelector('.var-tamanho').value;
                const estoque = linha.querySelector('.var-estoque').value;
                const arquivoFotoCor = linha.querySelector('.var-foto').files[0];

                // Upload da foto exclusiva desta cor
                const nomeFotoCorUnico = `${Date.now()}_cor_${cor}_${i}_${arquivoFotoCor.name}`;
                
                const { error: erroUploadCor } = await supabaseClient
                    .storage
                    .from('produtos')
                    .upload(`fotos_cores/${nomeFotoCorUnico}`, arquivoFotoCor);

                if (erroUploadCor) throw new Error(`Erro no upload da foto da cor ${cor}: ${erroUploadCor.message}`);

                const { data: dadosUrlCor } = supabaseClient
                    .storage
                    .from('produtos')
                    .getPublicUrl(`fotos_cores/${nomeFotoCorUnico}`);

                const skuGerado = `REF-${produtoId}-${cor.toUpperCase().replace(/\s+/g, '')}-${tamanhoId}`;

                dadosVariacoesParaInserir.push({
                    produto_id: produtoId,
                    tamanho_id: parseInt(tamanhoId),
                    cor: cor,
                    quantidade_estoque: parseInt(estoque),
                    sku: skuGerado,
                    imagem_da_cor: dadosUrlCor.publicUrl // URL da foto da cor correspondente
                });
            }

            // Insere a grade de variações e estoques no banco
            const { error: erroVariacoes } = await supabaseClient
                .from('variacoes_estoque')
                .insert(dadosVariacoesParaInserir);

            if (erroVariacoes) throw new Error(`Erro ao salvar a grade de estoques: ${erroVariacoes.message}`);

            alert('🎉 Produto completo, fotos e grade de estoque salvos com absoluto sucesso!');
            containerVariacoes.innerHTML = '';
            form.reset();
            criarLinhaVariacao();

        } catch (error) {
            console.error(error);
            alert(`⚠️ Ocorreu uma falha: ${error.message}`);
        }
    });
}