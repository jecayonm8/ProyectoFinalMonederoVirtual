class SistemaCanjeoPuntos {
    constructor() {
        this.beneficiosDisponibles = {
            'descuento_transferencia_5': {
                nombre: 'Descuento 5% en Transferencias',
                descripcion: 'Obtén un 5% de descuento en tu próxima transferencia',
                costoPuntos: 100,
                tipo: 'descuento',
                valor: 0.05,
                usos: 1
            },
            'descuento_transferencia_10': {
                nombre: 'Descuento 10% en Transferencias',
                descripcion: 'Obtén un 10% de descuento en tu próxima transferencia',
                costoPuntos: 200,
                tipo: 'descuento',
                valor: 0.10,
                usos: 1
            },
            'descuento_transferencia_15': {
                nombre: 'Descuento 15% en Transferencias',
                descripcion: 'Obtén un 15% de descuento en tu próxima transferencia',
                costoPuntos: 300,
                tipo: 'descuento',
                valor: 0.15,
                usos: 1
            },
            'transferencia_gratis': {
                nombre: 'Transferencia Gratuita',
                descripcion: 'Realiza una transferencia sin costo adicional',
                costoPuntos: 80,
                tipo: 'transferencia_gratis',
                valor: 1,
                usos: 1
            }
        };
    }

    obtenerBeneficiosDisponibles(rangoCliente) {
        const beneficios = { ...this.beneficiosDisponibles };
        
        // Filtrar beneficios según el rango
        switch (rangoCliente) {
            case 'Bronce':
                // Solo beneficios básicos
                delete beneficios.descuento_transferencia_15;
                break;
            case 'Plata':
                // Acceso a más beneficios
                break;
            case 'Oro':
                // Descuento en costos de beneficios
                Object.keys(beneficios).forEach(key => {
                    beneficios[key].costoPuntos = Math.floor(beneficios[key].costoPuntos * 0.9);
                });
                break;
            case 'Platino':
                // Máximo descuento en costos
                Object.keys(beneficios).forEach(key => {
                    beneficios[key].costoPuntos = Math.floor(beneficios[key].costoPuntos * 0.8);
                });
                break;
        }
        
        return beneficios;
    }

    canjearBeneficio(cliente, beneficioId) {
        const beneficiosDisponibles = this.obtenerBeneficiosDisponibles(cliente.rango);
        const beneficio = beneficiosDisponibles[beneficioId];
        
        if (!beneficio) {
            return {
                exito: false,
                mensaje: 'Beneficio no disponible para tu rango.'
            };
        }
        
        if (cliente.puntos < beneficio.costoPuntos) {
            return {
                exito: false,
                mensaje: `Puntos insuficientes. Necesitas ${beneficio.costoPuntos} puntos.`
            };
        }
        
        // Descontar puntos
        cliente.puntos -= beneficio.costoPuntos;
        
        // Aplicar beneficio
        if (!cliente.beneficiosActivos) {
            cliente.beneficiosActivos = [];
        }
        
        const beneficioActivo = {
            id: beneficioId,
            nombre: beneficio.nombre,
            tipo: beneficio.tipo,
            valor: beneficio.valor,
            usosRestantes: beneficio.usos,
            fechaCanje: new Date().toISOString()
        };
        
        // Aplicar beneficio inmediato si es bono de puntos
        if (beneficio.tipo === 'bono_puntos') {
            cliente.puntos += beneficio.valor;
            return {
                exito: true,
                mensaje: `¡Beneficio canjeado! Has recibido ${beneficio.valor} puntos adicionales.`,
                beneficio: beneficioActivo
            };
        }
        
        cliente.beneficiosActivos.push(beneficioActivo);
        
        return {
            exito: true,
            mensaje: `¡Beneficio "${beneficio.nombre}" canjeado exitosamente!`,
            beneficio: beneficioActivo
        };
    }

    aplicarBeneficioEnTransaccion(cliente, tipoTransaccion, monto) {
        if (!cliente.beneficiosActivos || cliente.beneficiosActivos.length === 0) {
            return { descuento: 0, beneficioUsado: null };
        }
        
        let descuentoAplicado = 0;
        let beneficioUsado = null;
        
        // Buscar beneficio aplicable
        for (let i = 0; i < cliente.beneficiosActivos.length; i++) {
            const beneficio = cliente.beneficiosActivos[i];
            
            if (beneficio.usosRestantes <= 0) continue;
            
            if (tipoTransaccion === 'transferencia') {
                if (beneficio.tipo === 'descuento') {
                    descuentoAplicado = monto * beneficio.valor;
                    beneficio.usosRestantes--;
                    beneficioUsado = beneficio;
                    break;
                } else if (beneficio.tipo === 'transferencia_gratis') {
                    descuentoAplicado = monto; // Transferencia completamente gratis
                    beneficio.usosRestantes--;
                    beneficioUsado = beneficio;
                    break;
                }
            }
        }
        
        // Limpiar beneficios agotados
        if (cliente.beneficiosActivos) {
            cliente.beneficiosActivos = cliente.beneficiosActivos.filter(b => b.usosRestantes > 0);
        }
        
        return { descuento: descuentoAplicado, beneficioUsado };
    }

    obtenerMultiplicadorPuntosPorRango(rango) {
        switch (rango) {
            case 'Bronce': return 1.0;
            case 'Plata': return 1.1;
            case 'Oro': return 1.25;
            case 'Platino': return 1.5;
            default: return 1.0;
        }
    }
}

export default SistemaCanjeoPuntos;
