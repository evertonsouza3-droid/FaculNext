// vocacional-shared.js - Lógica Científica RIASEC Compartilhada
const questoesRIASEC = [
    { tipo: 'R', icone: '🛠️', titulo: 'Técnico / Prático', texto: 'Montar, consertar equipamentos ou trabalhar com as mãos.' },
    { tipo: 'R', icone: '⛺', titulo: 'Técnico / Prático', texto: 'Praticar esportes ou atividades ao ar livre e físicas.' },
    { tipo: 'I', icone: '🧬', titulo: 'Investigativo', texto: 'Pesquisar temas complexos e resolver problemas de lógica.' },
    { tipo: 'I', icone: '🔬', titulo: 'Investigativo', texto: 'Estudar ciências ou entender como tecnologias funcionam.' },
    { tipo: 'A', icone: '🎨', titulo: 'Artístico', texto: 'Criar designs, escrever contos ou tocar instrumentos.' },
    { tipo: 'A', icone: '🎭', titulo: 'Artístico', texto: 'Expressar ideias através de teatro, dança ou artes visuais.' },
    { tipo: 'S', icone: '🤝', titulo: 'Social', texto: 'Ajudar pessoas, ensinar ou cuidar do bem-estar dos outros.' },
    { tipo: 'S', icone: '🕊️', titulo: 'Social', texto: 'Trabalhar em equipe para resolver problemas da comunidade.' },
    { tipo: 'E', icone: '🚀', titulo: 'Empreendedor', texto: 'Liderar projetos, convencer pessoas e tomar decisões.' },
    { tipo: 'E', icone: '💼', titulo: 'Empreendedor', texto: 'Criar novos negócios ou gerenciar equipes de sucesso.' },
    { tipo: 'C', icone: '📊', titulo: 'Convencional', texto: 'Organizar dados, planilhas e processos detalhados.' },
    { tipo: 'C', icone: '🏛️', titulo: 'Convencional', texto: 'Trabalhar em ambientes estruturados e seguir regras claras.' }
];

const perfisRIASEC = {
    'R': { nome: 'Prático e Construtivo', desc: 'Seu perfil é voltado para a execução técnica. Você brilha em Engenharias, Tecnologia Aplicada e áreas que exigem precisão manual e resolução de problemas físicos.' },
    'I': { nome: 'Explorador Investigativo', desc: 'Você é movido pela curiosidade. Seu caminho está em Medicinas, Pesquisa Científica, Ciência de Dados e áreas que exigem análise profunda.' },
    'A': { nome: 'Criador Artístico', desc: 'Sua mente é vibrante. Você se destaca em Design, Comunicação, Arquitetura e áreas onde a originalidade e a expressão são a moeda principal.' },
    'S': { nome: 'Mestre Social', desc: 'Sua vocação é o impacto humano. Educação, Psicologia, Gestão de Pessoas e Saúde Comunitária são onde você encontrará seu propósito.' },
    'E': { nome: 'Líder Empreendedor', desc: 'Você nasceu para liderar. Seu foco é Administração, Direito, Marketing e o mundo dos negócios, onde influência e decisão são vitais.' },
    'C': { nome: 'Estrategista Convencional', desc: 'Você é o pilar da organização. Brilha em Contabilidade, Logística, TI de Infraestrutura e áreas que exigem controle, dados e processos perfeitos.' }
};

function calcularResultadoRIASEC(pontuacao) {
    let max = -1;
    let dominante = 'S';
    for (let tipo in pontuacao) {
        if (pontuacao[tipo] > max) {
            max = pontuacao[tipo];
            dominante = tipo;
        }
    }
    return perfisRIASEC[dominante];
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { questoesRIASEC, perfisRIASEC, calcularResultadoRIASEC };
}
