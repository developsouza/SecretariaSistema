import { forwardRef } from "react";
import { maskCPF, maskCNPJ, maskPhone, maskCEP } from "../utils/masks";

const MASKS = {
    cpf: maskCPF,
    cnpj: maskCNPJ,
    phone: maskPhone,
    tel: maskPhone,
    celular: maskPhone,
    whatsapp: maskPhone,
    cep: maskCEP,
};

/**
 * Input com máscara, compatível com react-hook-form `register`.
 *
 * @example
 * <MaskedInput mask="cpf" className="input" placeholder="000.000.000-00" {...register("cpf")} />
 */
const MaskedInput = forwardRef(function MaskedInput({ mask, onChange, ...props }, ref) {
    const maskFn = mask ? MASKS[mask] : null;

    const handleChange = (e) => {
        if (maskFn) {
            e.target.value = maskFn(e.target.value);
        }
        onChange?.(e);
    };

    // onInput garante que o valor visual seja atualizado imediatamente durante a digitação
    const handleInput = (e) => {
        if (maskFn) {
            const masked = maskFn(e.target.value);
            if (e.target.value !== masked) {
                e.target.value = masked;
            }
        }
    };

    return <input ref={ref} onChange={handleChange} onInput={handleInput} {...props} />;
});

export default MaskedInput;
