sap.ui.define([
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet",
    "sap/m/BusyIndicator",
    "sap/ui/model/Filter",
    "sap/ui/comp/smartfilterbar/SmartFilterBar",
    "sap/ui/model/json/JSONModel"
], function(MessageToast, Spreadsheet, BusyIndicator, Filter, SmartFilterBar, JSONModel) {
    'use strict';
    


     // Função utilitária para converter Base64 para Blob para download
     function b64toBlob(b64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 512;
        var byteCharacters = atob(b64Data);
        var byteArrays = [];
        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            var slice = byteCharacters.slice(offset, offset + sliceSize);
            var byteNumbers = new Array(slice.length);
            for (var i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            var byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        return new Blob(byteArrays, { type: contentType });
    }


    // Função auxiliar para preparar filtros simples
    function _prepareSimpleFilter(oFilter) {
        if (!oFilter?.ranges?.length) {
              return [oFilter.items];
          }
  
          return oFilter.ranges
         /* return oFilter.ranges.map(oRange => ({
              SIGN: oRange.sign || "I",
              OPTION: oRange.option || "EQ",
              LOW: oRange.low || "",
              HIGH: oRange.high || ""
          }));*/
      }


      
      return {
         
        // Função principal para o botão de exportar
        idExport: function (oEvent) {
            const oView = this.getView();
            const oSmartFilterBar = oView.byId("listReportFilter");


            if (!oSmartFilterBar) {
                MessageToast.show("Filtros não encontrados.");
                return;
            }

            sap.ui.core.BusyIndicator.show(0);

            // Obtém o modelo nomeado "processamento" a partir do componente principal
            const oModel = this.getOwnerComponent().getModel("processamento");

            if (!oModel) {
                sap.ui.core.BusyIndicator.hide();
                MessageToast.show("Modelo 'processamento' não encontrado. Verifique a configuração do manifest.json.");
                return;
            }

            try {
                const oSmartFilterData = oSmartFilterBar.getFilterData();
                const oPayload = this._preparePayload(oSmartFilterData, oSmartFilterBar);

                if (!this._isPayloadPopulated(oPayload)) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Nenhum filtro preenchido para exportação.");
                    return;
                }

                // Chamada para o serviço OData
                oModel.create("/ZDBG_EXPORT_XLS_01_SET", oPayload, {
                    success: this._handleSuccess.bind(this),
                    error: this._handleError.bind(this)
                });
            } catch (error) {
                sap.ui.core.BusyIndicator.hide();
                MessageToast.show("Ocorreu um erro ao preparar os dados de exportação.");
                console.error("Erro em idExport:", error);
            }
        },

        // Função que verifica se há dados no payload
        _isPayloadPopulated: function(oPayload) {
            return Object.values(oPayload).some(value => {
                if (typeof value === 'string') {
                    return value !== "[]" && value.length > 0;
                }
                return value !== null && value !== undefined;
            });
        },

        _formatrange: function ( oRange ){

            let aFormattedValues = [];

            if (oRange && oRange.ranges.length > 0 ){
             // Mapeia o array 'ranges' para um array de strings
             aFormattedValues = oRange.ranges.map( range => {
         
               if (range.value2){
         
                  return range.value1 + ',' + range.value2;
         
               }else{

                 return range.value1;
               }
                 
             });
         
         
           } 
           return aFormattedValues; 
         
         },

         _formatvalue: function( oValue ){

            let aValueKeys = [];

            if (oValue && oValue.value > 0 ){
        
               aValueKeys = oValue.value;
                               
            }

          return aValueKeys;
                
        },

        _formateitems: function( oItems ){

            let aItemsKeys = [];

            if (oItems && oItems.items && oItems.items.length > 0 ){

                 aItemsKeys = (oItems.items  || []).map(item => item.key);
                           
            }
            return aItemsKeys;
        },


        onBeforeRebindTableExtension: function() {
            const oSmartFilterBar = this.byId("listReportFilter");
            const oData = oSmartFilterBar.getFilterData();
            //const aGlactKeys = (oSmartFilterData.s_glact.items || []).map(item => item.key);
        
            // Se usuário selecionou "Todos Itens"
            if (oData.s_status && oData.s_status.items && oData.s_status.items.length > 0 && oData.s_status.items[0].key === "0") {
                // Remove o filtro → backend retorna todos
                
                
                const newvaluestatus = [
                    {key : "1"},
                    {key : "3"}
                ];

              oData.s_status.items = newvaluestatus;
              oSmartFilterBar.setFilterData(oData);
            }
        },
             
    
         //Prepara o payload para o serviço OData
        //_preparePayload: function (oSmartFilterData, oSmartFilterBar) {
         _preparePayload: function (oSmartFilterData,oSmartFilterBar) {
            const oPayload = {
                s_psdat: "",
                s_compy: "",
                s_status: "",
                s_ledger: "",
                s_glact: ""
               
            };

           

            if (oSmartFilterData.s_psdat) {
                oPayload.s_psdat = JSON.stringify(_prepareSimpleFilter(oSmartFilterData.s_psdat));
                //oPayload.s_psdat = _prepareSimpleFilter(oSmartFilterData.s_psdat);
            }

            //Filtro Empresa

            let oCompy ;

            if (oSmartFilterData.s_compy) {


                if (oSmartFilterData.s_compy.ranges.length > 0){

                   oCompy = this._formatrange(oSmartFilterData.s_compy);                

                }else if (oSmartFilterData.s_compy && oSmartFilterData.s_compy.items && oSmartFilterData.s_compy.items.length > 0){

                    oCompy = this._formateitems(oSmartFilterData.s_compy);


                }else if (oSmartFilterData.s_compy.value ){

                    oCompy = this._formatvalue(oSmartFilterData.s_compy);
                }

                if ( oCompy.length === 1 ){


                    oPayload.s_compy = String(oCompy);

                }else if (oCompy.length  > 1){

                    oPayload.s_compy = oCompy.join(',');
                }else{


                    oPayload.s_compy = oCompy;
                }

                
            }

   
            //Filtro Conta do Razão
            let aGlactKeys ;

            if (oSmartFilterData.s_glact) {

                if (oSmartFilterData.s_glact.items.length > 0 ) {
                    aGlactKeys = (oSmartFilterData.s_glact.items || []).map(item => item.key);
                    oPayload.s_glact = aGlactKeys.join(",");

                }else if(oSmartFilterData.s_glact.value > 0){

                    aGlactKeys =  _formatvalue( oSmartFilterData.s_glact)  ;
                    oPayload.s_glact = aGlactKeys;

                }else if (oSmartFilterData.s_glact.ranges.length > 0){

                

                    const aValues = this._formatrange( oSmartFilterData.s_glact );

                    if (aValues.length  > 1){
                        // Junta os valores com vírgula para formar a string final
                        oPayload.s_glact = aValues.join(',');
                    }else{
                        oPayload.s_glact = aValues;
                    }

                   
                }
            } 


            //Filtro de Status

            let oStatus ;

            if (oSmartFilterData.s_status) {

                if (oSmartFilterData.s_status && oSmartFilterData.s_status.items && oSmartFilterData.s_status.items.length > 0){

                    oStatus = this._formateitems(oSmartFilterData.s_status);

                }else if ( oSmartFilterData.s_status.value ){
                                        
                    oStatus = this._formatvalue(oSmartFilterData.s_status);
                    

                }else if(oSmartFilterData.s_status && oSmartFilterData.s_status.ranges && oSmartFilterData.s_status.ranges.length > 0){

                    oStatus = this._formatrange(oSmartFilterData.s_status);

                }
                
                if (oStatus.length === 1) {
                    // Se for apenas um valor, envie-o como uma string
                   // oPayload.s_status = oStatus[0];
                   oPayload.s_status = String(oStatus[0]);
                } else if (oStatus.length  > 1){

                    oPayload.s_status = oStatus.join(',') ;
                }else{
                    oPayload.s_status = null;
                }
              
            }

            //Filtro Ledger Fonte
            if (oSmartFilterData.s_ledger){
                if (oSmartFilterData.s_ledger.items && oSmartFilterData.s_ledger.items.length > 0 ) {
                    //oPayload.s_ledger = JSON.stringify(_prepareSimpleFilter(oSmartFilterData.s_ledger));
                        const aledgerKeys = (oSmartFilterData.s_ledger.items || []).map(item => item.key);
                        oPayload.s_ledger = aledgerKeys.join(",");
    
                }else if (oSmartFilterData.s_ledger.ranges && oSmartFilterData.s_ledger.ranges.length >0 ){
    
                        const aValuesledger = oSmartFilterData.s_ledger.ranges.map(range => {
                        const valuesledger = [];
                        if (range.value1) {
                            valuesledger.push(range.value1);
                        }
                        // Adiciona value2 apenas se ele existir (não for null)
                        if (range.value2) {
                            valuesledger.push(range.value2);
                        }
                        return valuesledger;
                    }).flat(); // O método flat() junta os sub-arrays em um único array
    
                    // Junta os valores com vírgula para formar a string final                
                    oPayload.s_ledger = aValuesledger.join(',');
    
    
                }             

            }
            
            return oPayload;
        },


        // Função de sucesso para a chamada OData
       _handleSuccess: function (oData, oResponse) {
            sap.ui.core.BusyIndicator.hide();
            MessageToast.show("Dados exportados com sucesso!");

            if (oData.EXCELFILE) {
                //const sFilename = "Exportacao_" + new Date().toISOString().slice(0, 10) + ".xlsx";
            
                const now = new Date();

                    // pega ano, mês, dia
                    const yyyy = now.getFullYear();
                    const mm = String(now.getMonth() + 1).padStart(2, "0");
                    const dd = String(now.getDate()).padStart(2, "0");

                    // pega hora e minuto
                    const hh = String(now.getHours()).padStart(2, "0");
                    const min = String(now.getMinutes()).padStart(2, "0");

                    // monta o nome do arquivo
                const sFilename = `${yyyy}${mm}${dd}_${hh}${min}.xlsx`;
                const blob = b64toBlob(oData.EXCELFILE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                
                const link = document.createElement("a");
                link.href = window.URL.createObjectURL(blob);
                link.download = sFilename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                MessageToast.show("Nenhum arquivo retornado do servidor.");
            }
        },

        // Função de erro para a chamada OData
        _handleError: function (oError) {
            sap.ui.core.BusyIndicator.hide();
            MessageToast.show("Erro na exportação de dados!");
            console.error("Erro na chamada OData:", oError);
        }
    }

    /*_onFiltrarTodosItens: function (oEvent) {
        const oSmartFilterBar = this.getView().byId("listReportFilter");
        const oData = oSmartFilterBar.getFilterData();

        // Se o status selecionado for "Todos Itens"
        if (oData.Status === "0") {
            // Força limpar o filtro Status => traz todos os registros
            delete oData.Status;
            oSmartFilterBar.setFilterData(oData);
        }
    }*/
   
});