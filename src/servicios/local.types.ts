export interface RegistroPendiente {
  id: string;
  lineaId: string;
  paradaId: string;
  motivo: string;
  comentario: string | null;
  fotoUri: string | null;
  fechaHora: string;
}

export interface CacheFila {
  valor: string;
  actualizado_en: string;
}
