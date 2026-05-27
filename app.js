// Configurações do Supabase (Substitua com as credenciais do seu painel)
const BLING_URL = 'https://doosgdowyndlsaqcrplw.supabase.co';
const BLING_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvb3NnZG93eW5kbHNhcWNycGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NTI5MzEsImV4cCI6MjA5NTEyODkzMX0.z39eC9cSv1ay3KDrK4hNBRrLsi53HSpy8kCEIxwVcoY';

// Inicialização do cliente do banco de dados
const supabaseClient = supabase.createClient(BLING_URL, BLING_KEY);

let cart = [];
let currentUser = null;
let deliveryValida = false;

// OUVINTE: Monitora se o usuário está logado ou deslogado no Supabase
supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    const statusText = document.getElementById('user-status');
    const loginBtn = document.getElementById('btn-login-modal');
    
    if (currentUser) {
        statusText.innerText = `Olá, ${currentUser.email}`;
        loginBtn.innerText = "Sair";
        loginBtn.onclick = logout;
    } else {
        statusText.innerText = "Olá, visitante!";
        loginBtn.innerText = "Login / Cadastro";
        loginBtn.onclick = () => toggleModal('login-modal');
    }
});

// AUTENTICAÇÃO: Cadastrar novo cliente
// AUTENTICAÇÃO: Cadastrar novo cliente com Endereço e Telefone
async function signUp() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Captura dos novos campos da tela de cadastro
    const telefone = document.getElementById('cadastro-telefone').value;
    const cep = document.getElementById('cadastro-cep').value;
    const rua = document.getElementById('cadastro-rua').value;
    const numero = document.getElementById('cadastro-numero').value;
    const complemento = document.getElementById('cadastro-comp').value;

    // Validação estrita de campos vazios
    if (!email || !password || !telefone || !cep || !rua || !numero) {
        alert("Por favor, preencha todos os campos obrigatórios (*) para criar seu cadastro!");
        return;
    }

    // Envia o cadastro ao Supabase guardando o endereço nos metadados do usuário
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                telefone: telefone,
                cep: cep,
                rua: rua,
                numero: numero,
                complemento: complemento
            }
        }
    });

    if (error) {
        alert("Erro no cadastro: " + error.message);
    } else {
        alert('Cadastro realizado com sucesso! Suas informações de entrega foram salvas.');
        
        // Limpa os campos do modal
        document.getElementById('cadastro-telefone').value = '';
        document.getElementById('cadastro-cep').value = '';
        document.getElementById('cadastro-rua').value = '';
        document.getElementById('cadastro-numero').value = '';
        document.getElementById('cadastro-comp').value = '';
        
        toggleModal('login-modal');
    }
}

// AUTENTICAÇÃO: Fazer Login
async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if(!email || !password) { alert("Preencha todos os campos!"); return; }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        alert("Falha no login: " + error.message);
    } else {
        toggleModal('login-modal');
    }
}

// AUTENTICAÇÃO: Sair da conta
async function logout() {
    await supabaseClient.auth.signOut();
    alert("Você saiu da sua conta.");
}

// INTERFACE: Alternar abertura/fechamento do Modal
function toggleModal(id) {
    const modal = document.getElementById(id);
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

// CARRINHO: Adicionar item
function addToCart(name, price) {
    cart.push({ name, price });
    updateCartUI();
}

// INTERFACE: Atualizar tela do Carrinho
function updateCartUI() {
    const list = document.getElementById('cart-items');
    const totalSpan = document.getElementById('cart-total-value');
    list.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        const li = document.createElement('li');
        li.style.padding = "4px 0";
        li.innerText = `${item.name} - R$ ${item.price.toFixed(2)}`;
        list.appendChild(li);
        total += item.price;
    });

    totalSpan.innerText = total.toFixed(2);
}

// LOGÍSTICA: Verificação de CEP (Filtra os 5 primeiros dígitos para o raio de 5km)
async function verificarCepEntrega() {
    const cepInput = document.getElementById('cep-input').value;
    const feedback = document.getElementById('delivery-feedback');
    const blocoCampos = document.getElementById('campos-entrega-contato');

    // Remove traços e caracteres não numéricos
    const cepLimpo = cepInput.replace(/\D/g, '');

    if (cepLimpo.length !== 8) {
        feedback.innerText = "Digite um CEP válido com 8 números.";
        feedback.style.color = "var(--error-color)";
        deliveryValida = false;
        blocoCampos.style.display = 'none';
        return;
    }

    feedback.innerText = "Verificando distância da rota...";
    feedback.style.color = "gray";

    const prefixoCep = cepLimpo.substring(0, 5);

    // Consulta se o prefixo bate com as regiões cadastradas no Supabase
    const { data, error } = await supabaseClient
        .from('ceps_atendidos')
        .select('bairro, tempo_estimado')
        .like('cep', `${prefixoCep}%`)
        .limit(1);

    if (error || !data || data.length === 0) {
        feedback.innerHTML = "❌ <b>Fora da área de cobertura de 5km!</b><br>Não conseguimos realizar entregas de moto neste endereço.";
        feedback.style.color = "var(--error-color)";
        deliveryValida = false;
        blocoCampos.style.display = 'none';
    } else {
        feedback.innerHTML = `✅ <b>Entrega Disponível! (${data[0].bairro})</b><br>⏱️ <b>Previsão do Motoqueiro:</b> ${data[0].tempo_estimado} após a postagem.`;
        feedback.style.color = "var(--success-color)";
        deliveryValida = true;
        blocoCampos.style.display = 'block'; // Abre o formulário de endereço completo
    }
}

// LOGÍSTICA: Finalizar a Venda e Mostrar motivos de erro na tela
async function checkout() {
    const containerErros = document.getElementById('checkout-errors');
    const listaErros = document.getElementById('lista-erros');
    
    // Limpa a caixa de erros a cada nova tentativa
    containerErros.style.display = 'none';
    listaErros.innerHTML = '';
    let erros = [];

    // 1. Validação de Login
    if (!currentUser) {
        erros.push("Você precisa estar conectado à sua conta. Clique em 'Login / Cadastro' no topo.");
    }

    // 2. Validação de Carrinho
    if (cart.length === 0) {
        erros.push("Seu carrinho está vazio. Adicione produtos antes de finalizar.");
    }

    // 3. Validação do CEP
    if (!deliveryValida) {
        erros.push("É necessário informar e validar um CEP atendido dentro do raio de 5km.");
    }

    // Coleta dos campos complementares
    const cep = document.getElementById('cep-input').value;
    const rua = document.getElementById('rua-input').value;
    const numero = document.getElementById('numero-input').value;
    const complemento = document.getElementById('comp-input').value;
    const telefoneRaw = document.getElementById('entrega-telefone').value;
    const telefoneLimpo = telefoneRaw.replace(/\D/g, '');

    // Valida o preenchimento se o CEP for aceito
    if (deliveryValida) {
        if (!rua.trim()) {
            erros.push("O campo 'Rua/Avenida' precisa ser preenchido.");
        }
        if (!numero.trim()) {
            erros.push("O campo 'Número' é obrigatório.");
        }
        if (!telefoneLimpo) {
            erros.push("O número de WhatsApp é obrigatório.");
        } else if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
            erros.push("O número de WhatsApp está incompleto. Digite o DDD + Número.");
        }
    }

    // Se houver qualquer erro, monta a lista e exibe na tela
    if (erros.length > 0) {
        erros.forEach(erro => {
            const li = document.createElement('li');
            li.innerText = erro;
            listaErros.appendChild(li);
        });
        containerErros.style.display = 'block';
        containerErros.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    // Fluxo de Sucesso: Grava o pedido estruturado no Supabase
    const totalCompra = cart.reduce((sum, item) => sum + item.price, 0);
    const enderecoCompleto = `${rua}, Nº ${numero} ${complemento ? '- ' + complemento : ''} - CEP: ${cep}`;
    const contatoCliente = `WhatsApp: (${telefoneLimpo.substring(0,2)}) ${telefoneLimpo.substring(2)}`;

    const { data, error } = await supabaseClient
        .from('pedidos')
        .insert([
            { 
                usuario_id: currentUser.id, 
                itens: cart, 
                total: totalCompra,
                cep_entrega: `${enderecoCompleto} | Contato: ${contatoCliente}`, 
                status: 'Pendente'
            }
        ]);

    if (error) {
        const li = document.createElement('li');
        li.innerText = "Erro ao enviar para o banco: " + error.message;
        listaErros.appendChild(li);
        containerErros.style.display = 'block';
    } else {
        alert(`Pedido confirmado com sucesso!\nO motoqueiro sairá para entrega em breve.`);
        
        // Reseta o estado completo da tela
        cart = [];
        updateCartUI();
        document.getElementById('rua-input').value = '';
        document.getElementById('numero-input').value = '';
        document.getElementById('comp-input').value = '';
        document.getElementById('entrega-telefone').value = '';
        document.getElementById('cep-input').value = '';
        document.getElementById('campos-entrega-contato').style.display = 'none';
        document.getElementById('delivery-feedback').innerText = '';
        deliveryValida = false;
    }
}