import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  preferences: string;
  frequency?: 'baixa' | 'media' | 'alta';
  averageSpent: number;
  createdAt: string;
}

interface ClientFormProps {
  onClientAdd: (client: Omit<Client, "id" | "frequency" | "averageSpent" | "createdAt">) => Promise<void>;
}

export const ClientForm = ({ onClientAdd }: ClientFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
    preferences: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      toast({
        title: "Erro",
        description: "Por favor, preencha os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      await onClientAdd(formData);
    } catch {
      toast({ title: "Erro", description: "Não foi possível salvar o cliente.", variant: "destructive" });
      return;
    }
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      birthDate: '',
      preferences: '',
    });

    toast({
      title: "Sucesso!",
      description: "Cliente cadastrado com sucesso.",
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Cadastro de Cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: João Silva"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Ex: joao@email.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="Ex: (11) 99999-9999"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleChange('birthDate', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Ex: Rua das Flores, 123 - Centro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferences">Preferências de atendimento</Label>
            <Textarea
              id="preferences"
              value={formData.preferences}
              onChange={(e) => handleChange('preferences', e.target.value)}
              placeholder="Ex: sem cebola, ponto da carne, contato preferido..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Não registre documentos, dados de saúde ou outras informações sensíveis neste campo.
            </p>
          </div>

          <Button type="submit" variant="burger" size="lg" className="w-full">
            Cadastrar Cliente
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
