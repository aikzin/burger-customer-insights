import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  preferences: string;
  frequency: 'baixa' | 'media' | 'alta';
  averageSpent: number;
  createdAt: string;
}

interface ClientFormProps {
  onClientAdd: (client: Client) => void;
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
    frequency: 'media' as const,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: "Erro",
        description: "Por favor, preencha os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const newClient: Client = {
      id: Date.now().toString(),
      ...formData,
      averageSpent: 0,
      createdAt: new Date().toISOString(),
    };

    onClientAdd(newClient);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      birthDate: '',
      preferences: '',
      frequency: 'media',
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
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Ex: joao@email.com"
                required
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
            <Label htmlFor="frequency">Frequência de Compras</Label>
            <Select 
              value={formData.frequency} 
              onValueChange={(value: 'baixa' | 'media' | 'alta') => handleChange('frequency', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa (1-2x por mês)</SelectItem>
                <SelectItem value="media">Média (1-2x por semana)</SelectItem>
                <SelectItem value="alta">Alta (3+ por semana)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferences">Preferências/Observações</Label>
            <Textarea
              id="preferences"
              value={formData.preferences}
              onChange={(e) => handleChange('preferences', e.target.value)}
              placeholder="Ex: Sem cebola, extra bacon, alérgico a lactose..."
              rows={3}
            />
          </div>

          <Button type="submit" variant="burger" size="lg" className="w-full">
            Cadastrar Cliente
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};