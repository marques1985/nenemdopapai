import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

// Alterando o nome da constante para 'supabaseClient'
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function carregarCatalogo() {
    const { data, error } = await supabaseClient
        .from('produtos')
        .select(`
            id,
            nome,
            preco_base,
            e_kit,
            categorias ( nome ), -- Traz se é Verão ou Inverno
            generos ( nome ),    -- Traz se é Menino ou Menina
            produtos_imagens_gerais ( url_imagem ), -- Traz as fotos mistas do produto
            variacoes_estoque (
                cor,
                quantidade_estoque,
                imagem_da_cor, -- Traz a foto específica daquela cor
                tamanhos ( nome )
            )
        `);

    if (error) {
        console.error(error);
        return;
    }

    console.log("Seu catálogo completo:", data);
}

carregarCatalogo();