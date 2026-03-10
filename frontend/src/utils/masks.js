// ─── Funções de máscara ────────────────────────────────────────────────────────

export const maskCPF = (v = "") =>
    v
        .replace(/\D/g, "")
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export const maskCNPJ = (v = "") =>
    v
        .replace(/\D/g, "")
        .slice(0, 14)
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d{1,2})$/, "$1-$2");

export const maskPhone = (v = "") => {
    const digits = v.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};

export const maskCEP = (v = "") =>
    v
        .replace(/\D/g, "")
        .slice(0, 8)
        .replace(/(\d{5})(\d{1,3})$/, "$1-$2");
