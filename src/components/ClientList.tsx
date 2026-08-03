import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Phone, Mail, MapPin, Calendar } from "lucide-react";
import type { Client } from "./ClientForm";

interface ClientListProps {
  clients: Client[];
}

export const ClientList = ({ clients }: ClientListProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.phone.includes(searchTerm);
    
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <Card className="surface-elevated rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl">Lista de clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 rounded-xl pl-10"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {clients.length === 0 ? "Nenhum cliente cadastrado ainda." : "Nenhum cliente encontrado com os filtros aplicados."}
              </div>
            ) : (
              filteredClients.map((client) => (
                <Card key={client.id} className="rounded-2xl transition-all duration-300 hover:border-primary/25 hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {client.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">{client.name}</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          {client.email && <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>{client.email}</span>
                          </div>}
                          
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{client.phone}</span>
                          </div>
                          
                          {client.address && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{client.address}</span>
                            </div>
                          )}
                          
                          {client.birthDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(client.birthDate).toLocaleDateString('pt-BR')}</span>
                            </div>
                          )}
                        </div>
                        
                        {client.preferences && (
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">
                              <strong>Preferências:</strong> {client.preferences}
                            </p>
                          </div>
                        )}
                        
                        <div className="mt-3 flex flex-col gap-1 border-t pt-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-sm text-muted-foreground">
                            Cliente desde: {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-sm font-medium">
                            Gasto médio: R$ {client.averageSpent.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
