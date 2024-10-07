import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import axios from 'axios';
import { Client } from '@microsoft/microsoft-graph-client';

@Injectable()
export class SharepointService {
  constructor(private readonly authService: AuthService) {}

  private async getAxiosInstance() {
    try {
      const token = await this.authService.getAccessToken();
        
      return axios.create({
        baseURL: process.env.SHAREPOINT_SITE_URL,
        headers: {
          Authorization: `Bearer ${token}`, 
          Accept: 'application/json;odata=verbose',
        },
      });
    } catch (err) {
      console.error('Erro ao obter token ou criar instância do Axios:', err);
      throw new HttpException('Erro ao criar uma instância do axios', HttpStatus.BAD_REQUEST);
    }
  }
  
  public async getGraphClient(): Promise<Client> {
    const token = await this.authService.getAccessToken();

    return Client.init({
      authProvider: (done) => {
        done(null, token);
      },
    });
  }
  
  public async getListItems(listTitle: string, siteId: string, listId: string) {
    const client = await this.getGraphClient();
    const allItems = [];
    let hasNextPage = true;
    let skipToken = '';
  
    try {
      while (hasNextPage) {
        const response = await client
          .api(`/sites/${siteId}/lists/${listId}/items`)
          .top(5000) // Buscar 5000 itens por vez
          .expand('fields')
          .skipToken(skipToken)
          .get();
  
        allItems.push(...response.value);
  
        skipToken = response['@odata.nextLink'] ? response['@odata.nextLink'].split('$skiptoken=')[1] : '';
        hasNextPage = !!skipToken; // Continuar se existir mais páginas
      }
  
      return allItems;
    } catch (err) {
      console.error(`Erro ao buscar itens da lista ${listTitle}:`, err);
      throw new HttpException(`Erro ao buscar dados no Microsoft Graph ${listTitle}`, HttpStatus.BAD_REQUEST);
    }
  }

  public async updateListItem(listTitle: string, itemId: number, payload: any, listId) {
    const client = await this.getGraphClient();

    try{
      const response = await client
      .api(`/sites/${process.env.SITE_ID}/lists/${listId}/items/${itemId}`)
      .update({
        fields: payload,
      });
      return response
    }catch(err){
      throw new HttpException(`Erro ao atualizar dados na lista: ${listTitle}`, HttpStatus.BAD_REQUEST, err);
    }
  }
  public async createListItem(listTitle: string, payload: any, listId: string) {
    try {
      const client = await this.getGraphClient();
      const response = await client
        .api(`/sites/${process.env.SITE_ID}/lists/${listId}/items`)
        .post(payload);
      return response;
    } catch (err) {
      console.error('Erro ao criar novo item na lista:', err);
      throw new HttpException(`Erro ao criar novo item na lista: ${listTitle}`, HttpStatus.BAD_REQUEST);
    }
  }

  public async deleteListItem(listTitle: string, itemId: number, listId: string) {
    try {
      const client = await this.getGraphClient();
      const response = await client
        .api(`/sites/${process.env.SITE_ID}/lists/${listId}/items/${itemId}`)
        .delete();
  
      return {
        message: `Item ${itemId} da lista ${listTitle} foi deletado com sucesso.`,
        status: response,
      };
    } catch (err) {
      console.error(`Erro ao deletar o item ${itemId} da lista ${listTitle}:`, err);
      throw new HttpException(`Erro ao deletar o item ${itemId} na lista: ${listTitle}`, HttpStatus.BAD_REQUEST);
    }
  }
}