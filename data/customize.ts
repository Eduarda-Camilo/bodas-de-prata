import type { TripEvent } from "./types";
// TODO DUDA: inserir reservas, estabelecimentos e fotos REAIS aqui.
// IDs são estáveis: não mude a posição dos eventos existentes; os checks e fotos usam esses IDs.
// Este arquivo substitui somente os campos indicados no evento correspondente.
// location é substituído por inteiro: informe name, city e state também.
export const eventOverrides: Record<string, Partial<TripEvent>> = {
  // 'day-8-12': {
  //   title: 'Check-in na pousada',
  //   location: {name: 'NOME REAL', city: 'Tiradentes', state: 'MG', address: 'ENDEREÇO REAL'},
  //   accommodation: {checkIn: '08/11 após 15h', checkOut: '10/11 por volta de 10h'},
  //   referenceImages: [{src: '/referencias/pousada.jpg', alt: 'Fachada da pousada'}],
  // },
  // 'day-8-6': {
  //   stampPlace: {verified: true, name: 'PONTO OFICIAL VERIFICADO', address: 'ENDEREÇO', mapsUrl: 'URL OFICIAL DO MAPS'},
  //   location: {name: 'PONTO OFICIAL VERIFICADO', city: 'Ouro Preto', state: 'MG', address: 'ENDEREÇO'},
  // },
  // 'day-13-4': {startTime: '10:30', approximateTime: false, description: 'Horário conforme reserva confirmada'},
  // 'day-14-8': {
  //   description: 'Detalhes da reserva confirmada',
  //   location: {name: 'RESTAURANTE REAL', city: 'Paraty', state: 'RJ', address: 'ENDEREÇO REAL'},
  // },
};
