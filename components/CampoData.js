import { useState } from 'react';
import { Platform, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// No nativo usamos o seletor real do sistema (@react-native-community/datetimepicker).
// Na web esse pacote não existe, então usamos <input type="date"> do próprio navegador,
// que já abre o calendário nativo do sistema operacional/navegador do usuário.
let DateTimePickerNativo = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line global-require
  DateTimePickerNativo = require('@react-native-community/datetimepicker').default;
}

function paraTextoBR(data) {
  return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
}

function paraInputISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Campo de seleção de data multiplataforma.
 *
 * @param {Date} valor - data atualmente selecionada
 * @param {(novaData: Date) => void} aoAlterar - chamado quando o usuário escolhe uma nova data
 * @param {object} cores - paleta do tema atual (ThemeContext)
 * @param {object} estilo - estilo extra pro container (opcional)
 */
export default function CampoData({ valor, aoAlterar, cores, estilo }) {
  const [mostrarNativo, setMostrarNativo] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.wrapperWeb, { borderColor: cores.borda }, estilo]}>
        <input
          type="date"
          value={paraInputISO(valor)}
          onChange={(e) => {
            if (!e.target.value) return;
            const [ano, mes, dia] = e.target.value.split('-').map(Number);
            aoAlterar(new Date(ano, mes - 1, dia));
          }}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            fontFamily: 'inherit',
            color: cores.texto,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
          }}
        />
        <Ionicons name="calendar-outline" size={19} color={cores.primario} />
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.seletor, { borderColor: cores.borda }, estilo]}
        onPress={() => setMostrarNativo(true)}
      >
        <Text style={[styles.texto, { color: cores.texto }]}>{paraTextoBR(valor)}</Text>
        <Ionicons name="calendar-outline" size={19} color={cores.primario} />
      </TouchableOpacity>
      {mostrarNativo && (
        <DateTimePickerNativo
          value={valor}
          mode="date"
          locale="pt-BR"
          display={Platform.OS === 'android' ? 'calendar' : 'inline'}
          onChange={(_, selecionada) => {
            setMostrarNativo(false);
            if (selecionada) aoAlterar(selecionada);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  seletor: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wrapperWeb: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  texto: { fontSize: 14 },
});
