class SistemaCanjeoPuntos {
    constructor() {
        this.beneficiosDisponibles = {
            // Beneficios originales
            'descuento_transferencia_5': {
                nombre: 'Descuento 5% en Transferencias',
                descripcion: 'Obtén un 5% de descuento en tu próxima transferencia',
                costoPuntos: 100,
                tipo: 'descuento',
                valor: 0.05,
                usos: 1,
                cancelable: true
            },
            'descuento_transferencia_10': {
                nombre: 'Descuento 10% en Transferencias',
                descripcion: 'Obtén un 10% de descuento en tu próxima transferencia',
                costoPuntos: 200,
                tipo: 'descuento',
                valor: 0.10,
                usos: 1,
                cancelable: true
            },
            'descuento_transferencia_15': {
                nombre: 'Descuento 15% en Transferencias',
                descripcion: 'Obtén un 15% de descuento en tu próxima transferencia',
                costoPuntos: 300,
                tipo: 'descuento',
                valor: 0.15,
                usos: 1,
                cancelable: true
            },
            
            // Nuevos beneficios
            'reduccion_comision_10': {
                nombre: 'Reducción del 10% en comisión por transferencias',
                descripcion: 'Reduce un 10% en la comisión de tus transferencias por un mes',
                costoPuntos: 100,
                tipo: 'reduccion_comision',
                valor: 0.10,
                duracion: 30, // días
                fechaExpiracion: null,
                cancelable: true
            },
            'sin_cargos_retiros': {
                nombre: 'Un mes sin cargos por retiros',
                descripcion: 'Realiza retiros sin cargos adicionales durante un mes',
                costoPuntos: 500,
                tipo: 'sin_cargos_retiro',
                valor: 1.0,
                duracion: 30, // días
                fechaExpiracion: null,
                cancelable: true
            },
            'bono_saldo': {
                nombre: 'Bono de saldo de 50 unidades',
                descripcion: 'Recibe 50 unidades adicionales en tu cuenta',
                costoPuntos: 1000,
                tipo: 'bono_saldo',
                valor: 50,
                usos: 1,
                cancelable: false // No se puede cancelar una vez aplicado
            }
        };
    }

    obtenerBeneficiosDisponibles(rangoCliente) {
        const beneficios = { ...this.beneficiosDisponibles };
        
        // Aplicar beneficios según el rango mostrado en la imagen
        switch (rangoCliente) {
            case 'Bronce':
                // Acceso básico al monedero (1.0x puntos)
                // Limitar algunos beneficios premium
                delete beneficios.descuento_transferencia_15;
                delete beneficios.bono_saldo;
                break;
                
            case 'Plata':
                // Bono de puntos del 10% (1.1x puntos)
                // Acceso a beneficios de canje mejorados
                // No se aplican descuentos adicionales en canjes
                break;
                
            case 'Oro':
                // Bono de puntos del 25% (1.25x puntos)
                // 10% descuento en costos de canje
                Object.keys(beneficios).forEach(key => {
                    beneficios[key].costoPuntos = Math.floor(beneficios[key].costoPuntos * 0.9); // 10% descuento
                });
                
                // Añadir un beneficio exclusivo para nivel Oro
                beneficios['premium_oro'] = {
                    nombre: 'Beneficio Premium Oro',
                    descripcion: 'Beneficio exclusivo para clientes Oro',
                    costoPuntos: 300,
                    tipo: 'premium',
                    valor: 1.0,
                    usos: 1,
                    cancelable: true
                };
                break;
                
            case 'Platino':
                // Bono de puntos del 50% (1.5x puntos)
                // 20% descuento en costos de canje
                Object.keys(beneficios).forEach(key => {
                    beneficios[key].costoPuntos = Math.floor(beneficios[key].costoPuntos * 0.8); // 20% descuento
                });
                
                // Añadir beneficios exclusivos para nivel Platino
                beneficios['vip_platino'] = {
                    nombre: 'Beneficio VIP Platino',
                    descripcion: 'Acceso a servicios VIP exclusivos para clientes Platino',
                    costoPuntos: 400,
                    tipo: 'vip',
                    valor: 1.0,
                    usos: 1,
                    cancelable: true
                };
                
                beneficios['soporte_prioritario'] = {
                    nombre: 'Soporte Prioritario',
                    descripcion: 'Acceso a soporte prioritario 24/7',
                    costoPuntos: 200,
                    tipo: 'soporte',
                    valor: 1.0,
                    usos: 3,
                    cancelable: true
                };
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
        
        // Crear ID único para este beneficio activo
        const uniqueId = `${beneficioId}_${Date.now()}`;
        
        const beneficioActivo = {
            id: uniqueId,
            beneficioId: beneficioId,
            nombre: beneficio.nombre,
            tipo: beneficio.tipo,
            valor: beneficio.valor,
            fechaCanje: new Date().toISOString(),
            cancelable: beneficio.cancelable || false
        };
        
        // Configurar fecha de expiración para beneficios con duración
        if (beneficio.duracion) {
            const fechaExpiracion = new Date();
            fechaExpiracion.setDate(fechaExpiracion.getDate() + beneficio.duracion);
            beneficioActivo.fechaExpiracion = fechaExpiracion.toISOString();
        }
        
        // Configurar usos restantes para beneficios con usos limitados
        if (beneficio.usos) {
            beneficioActivo.usosRestantes = beneficio.usos;
        }
        
        // Aplicar beneficio inmediato si es bono de saldo
        if (beneficio.tipo === 'bono_saldo') {
            cliente.saldo += beneficio.valor;
            return {
                exito: true,
                mensaje: `¡Beneficio canjeado! Has recibido $${beneficio.valor.toFixed(2)} en tu cuenta.`,
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
            return { descuento: 0, beneficiosUsados: [] };
        }
        
        let descuentoTotal = 0;
        const beneficiosUsados = [];
        const ahora = new Date();
        
        // Actualizar y limpiar los beneficios expirados
        if (cliente.beneficiosActivos) {
            cliente.beneficiosActivos = cliente.beneficiosActivos.filter(b => {
                if (!b.fechaExpiracion) return true; // Sin fecha de expiración
                return new Date(b.fechaExpiracion) > ahora;
            });
        }
        
        // Separar beneficios por tipo
        const beneficiosDuracion = cliente.beneficiosActivos.filter(b => b.fechaExpiracion);
        const beneficiosInstantaneos = cliente.beneficiosActivos.filter(b => b.usosRestantes && !b.fechaExpiracion);
        
        // 1. Aplicar beneficios de duración (mensuales)
        for (const beneficio of beneficiosDuracion) {
            if (tipoTransaccion === 'transferencia' && beneficio.tipo === 'reduccion_comision') {
                // Reducir el porcentaje de comisión en transferencias
                const comisionEstimada = monto * 0.03; // Comisión base del 3%
                const descuento = comisionEstimada * beneficio.valor;
                descuentoTotal += descuento;
                beneficiosUsados.push({
                    ...beneficio,
                    descuentoAplicado: descuento
                });
            } else if (tipoTransaccion === 'retiro' && beneficio.tipo === 'sin_cargos_retiro') {
                // Sin cargos por retiro
                const cargoEstimado = Math.min(5, monto * 0.01); // Cargo base: $5 o 1% del monto
                descuentoTotal += cargoEstimado;
                beneficiosUsados.push({
                    ...beneficio,
                    descuentoAplicado: cargoEstimado
                });
            }
        }
        
        // 2. Aplicar beneficios instantáneos (como descuentos por uso)
        for (const beneficio of beneficiosInstantaneos) {
            // Verificar si el beneficio es por uso y si ya se agotaron los usos
            if (beneficio.usosRestantes <= 0) continue;
            
            if (tipoTransaccion === 'transferencia' && beneficio.tipo === 'descuento') {
                // Aplicar descuento directo en transferencia
                const descuento = monto * beneficio.valor;
                descuentoTotal += descuento;
                beneficiosUsados.push({
                    ...beneficio,
                    descuentoAplicado: descuento
                });
                
                // Decrementar uso
                beneficio.usosRestantes--;
                break; // Solo aplicar un beneficio instantáneo a la vez
            }
        }
        
        // Limpiar beneficios agotados por uso
        if (cliente.beneficiosActivos) {
            cliente.beneficiosActivos = cliente.beneficiosActivos.filter(b => {
                if (b.usosRestantes === undefined) return true;
                return b.usosRestantes > 0;
            });
        }
        
        return { 
            descuento: descuentoTotal, 
            beneficiosUsados: beneficiosUsados,
            // Para mantener compatibilidad con código existente
            beneficioUsado: beneficiosUsados.length > 0 ? beneficiosUsados[0] : null 
        };
    }

    obtenerMultiplicadorPuntosPorRango(rango) {
        // Retorna exactamente los valores de multiplicador de puntos mostrados en la imagen
        switch (rango) {
            case 'Bronce': return 1.0;  // 1.0x puntos
            case 'Plata': return 1.1;   // 1.1x puntos (10% más)
            case 'Oro': return 1.25;    // 1.25x puntos (25% más)
            case 'Platino': return 1.5; // 1.5x puntos (50% más)
            default: return 1.0;
        }
    }
}

export default SistemaCanjeoPuntos;
