sap.ui.define([
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet",
    "sap/m/BusyIndicator",
    "sap/ui/model/Filter",
    "sap/ui/comp/smartfilterbar/SmartFilterBar",
    "sap/m/ComboBox"
], function (MessageToast, Spreadsheet, BusyIndicator) {
    'use strict';


    function getEnvironment() {
        const currentUrl = window.location.href;

        const hashIndex = currentUrl.indexOf('#');
        
        if (hashIndex !== -1) {
            const baseUrl = currentUrl.substring(0, hashIndex);
            const newUrl = baseUrl + "#ExportExcel-display?";
            return newUrl;
        } else {
            
            MessageToast.show("URL n�o identificado.");
            return null;
    }
}

    return {
        onBeforeRendering: function () {
            var oButton = this.getView().byId("PrintButton");
            if (oButton) {
                oButton.setIcon("sap-icon://excel-attachment");
            }
        },

        Print: function (oEvent) {
            const environment = getEnvironment();
            if (!environment) {
                MessageToast.show("Ambiente n�o identificado!");
                return;
            }
        
            // Usar o BASE_URL correspondente ao ambiente
            const BASE_URL = environment;
        
            // Obter os filtros aplicados no SmartFilterBar
            var oSmartFilterBar = sap.ui.getCore().byId("com.aggire.zui5.prio.pt.xls.9::sap.suite.ui.generic.template.ListReport.view.ListReport::Z_FI_I_GLAccountLineItem--listReportFilter");
            var aFilters = oSmartFilterBar ? oSmartFilterBar.getFilters() : [];

        
            // Gerar a string para todos os filtros
            var filterString = this.getFilterHeaders(aFilters, oEvent);
        
            // Montar a URL com todos os parametros gerados
            var sapGuiTransactionUrl = this.buildSapGuiTransactionUrl(filterString, BASE_URL);
        
            new Promise((resolve) => {
                setTimeout(() => {
                    if (sapGuiTransactionUrl) {
                        window.open(sapGuiTransactionUrl, "_blank");
                    } else {
                        MessageToast.show("Nenhum filtro selecionado!");
                    }
                    resolve();
                }, 1000);
            }).then(() => {
                // Esconde o busy indicator ap�s a conclus�o da exporta��o
                // BusyIndicator.hide();
            });
        },

        // Helper function to retrieve filter headers
        getFilterHeaders: function (aFilters) {
            var filterStrings = {};  // Objeto para armazenar filtros por chave (como s_leadr, s_compy, etc.)
            var i = 1;  // Contador para numerar os filtros


            // Obter a SmartFilterBar associada � SmartTable
            var oSmartTable = this.getView().byId("com.aggire.zui5.prio.pt.xls.9::sap.suite.ui.generic.template.ListReport.view.ListReport::Z_FI_I_GLAccountLineItem--listReport");  // Substitua "smartTableId" pelo id correto da sua SmartTable
            var oSmartFilterBar = this.byId(oSmartTable.getSmartFilterId());

            // Pegar o valor selecionado para o filtro 'status'
            var oCustomControlStatus = oSmartFilterBar.getControlByKey("status");
            var sSelectedKeyStatus = oCustomControlStatus ? oCustomControlStatus.getSelectedKey() : null;

            // Pegar o valor selecionado para o filtro 'ledger'
            var oCustomControlLedger = oSmartFilterBar.getControlByKey("ledger");
            var sSelectedKeyLedger = oCustomControlLedger ? oCustomControlLedger.getSelectedKey() : null;


            // Fun��o recursiva para processar filtros compostos (filtros dentro de filtros)
            function processFilter(oFilter) {
                if (oFilter.aFilters && oFilter.aFilters.length) {
                    oFilter.aFilters.forEach(function (oSubFilter) {
                        processFilter(oSubFilter);  // Recurs�o em filtros compostos
                    });
                } else {
                    // Definir valores para LOW, HIGH e OP (operador)
                    var sFilterLowValue = oFilter.oValue1 || "Nenhum valor aplicado";
                    var sFilterHighValue = oFilter.oValue2 || "";
                    var sOperator = oFilter.sOperator || "EQ";  // Operador padr�o

                    // NEW: Check if the field is 's_glact' and the condition is above two lines (custom logic)
                    if (oFilter.sPath === "s_glact" && (sFilterLowValue > 2 || sFilterHighValue > 2)) {
                        return; // Skip this filter
                    }

                    aFilterHeaderRows.push({
                        field: oFilter.sPath,
                        operator: oFilter.sOperator, // Store the operator
                        lowValue: sFilterLowValue,  // LOW value of the filter
                        highValue: sFilterHighValue // HIGH value of the filter (if present)
                    });
                    
        
                    // Montar a string de filtro para este filtro
                    var filterString = `LOW${i}=${encodeURIComponent(sFilterLowValue)},` +
                                       `HIGH${i}=${encodeURIComponent(sFilterHighValue)},` +
                                       `OP${i}=${encodeURIComponent(sOperator)},`;
        
                    // Identificar o par�metro para qual este filtro pertence (nome do filtro)
                    var filterName = oFilter.sPath || "unknown";  // Caso o nome do filtro n�o esteja dispon�vel
        
                    // Adicionar o filtro ao objeto de filtros
                    if (!filterStrings[filterName]) {
                        filterStrings[filterName] = "";  // Iniciar a string de filtro para esse par�metro
                    }
                    filterStrings[filterName] += filterString;  // Concatenar a string de filtro para o par�metro
                    i++;  // Incrementar o contador
                }
            }
        
            // Processar todos os filtros passados para a fun��o
            if (aFilters && aFilters.length) {
                aFilters.forEach(function (oFilter) {
                    processFilter(oFilter);  // Processar cada filtro
                });
            }

            // Adicionar o filtro 'status' ao objeto de filtros, caso tenha sido selecionado
            if (sSelectedKeyStatus) {
                var statusFilterString = `s_status=${encodeURIComponent(sSelectedKeyStatus)},`;
                filterStrings["status"] = filterStrings["status"] ? filterStrings["status"] + statusFilterString : statusFilterString;
            }

            // Adicionar o filtro 'ledger' ao objeto de filtros, caso tenha sido selecionado
            if (sSelectedKeyLedger) {
                var ledgerFilterString = `s_ledger=${encodeURIComponent(sSelectedKeyLedger)},`;
                filterStrings["ledger"] = filterStrings["ledger"] ? filterStrings["ledger"] + ledgerFilterString : ledgerFilterString;
            }


        
            // Retornar todos os filtros concatenados em uma string no formato correto
            var filterParams = [];
            for (var filterName in filterStrings) {
                if (filterStrings.hasOwnProperty(filterName)) {
                    // Envolvemos o valor do filtro entre aspas para cada par�metro
                    filterParams.push(`${filterName}="${filterStrings[filterName]}"`);
                }
            }
        
            // Retornar a string com todos os filtros
            return filterParams.join("&");
        },

        // Build the SAP GUI transaction URL with the filters
        buildSapGuiTransactionUrl: function (filterString, BASE_URL) {
            // Verifica se filterString n�o est� vazio
            if (!filterString) {
                return null;  // Retorna null se n�o houver filtros
            }
        
            // Construir a URL final com todos os filtros concatenados
            var fullUrl = BASE_URL + filterString;
            return fullUrl;
        },
        getCustomAppStateDataExtension: function (oCustomData) {
            //the content of the custom field will be stored in the app state, so that it can be restored later, for example after a back navigation.
            //The developer has to ensure that the content of the field is stored in the object that is passed to this method.
            if (oCustomData) {
                var oCustomField1 = this.oView.byId("Status");
                if (oCustomField1) {
                    oCustomData.status = oCustomField1.getSelectedKey();
                }
            }
        },
        restoreCustomAppStateDataExtension: function (oCustomData) {
            //in order to restore the content of the custom field in the filter bar, for example after a back navigation,
            //an object with the content is handed over to this method. Now the developer has to ensure that the content of the custom filter is set to the control
            if (oCustomData) {
                if (oCustomData.status) {
                    var oComboBox = this.oView.byId("Status");
                    oComboBox.setSelectedKey(
                        oCustomData.status
                    );
                }
                if (oCustomData.ledger) {
                    var oLedgerComboBox = this.oView.byId("Ledger");
                    oLedgerComboBox.setSelectedKey(
                        oCustomData.ledger
                    );
                }
            }  
        },
        onBeforeRebindTableExtension: function(oEvent) {
            var oBindingParams = oEvent.getParameter("bindingParams");
        
            // Obtenha a SmartFilterBar associada
            var oSmartTable = oEvent.getSource();
            var oSmartFilterBar = this.byId(oSmartTable.getSmartFilterId());
            
            if (oSmartFilterBar) {
                // Acesse o controle customizado (ComboBox)
                var oCustomControl = oSmartFilterBar.getControlByKey("status");
                if (oCustomControl) {
                    // Obtenha o valor selecionado do ComboBox
                    var sSelectedKey = oCustomControl.getSelectedKey();
        
                    // Log para verificar o valor selecionado
                    console.log("Valor do filtro 'status' selecionado:", sSelectedKey);
        
                    // Verifica o valor selecionado
                    if (sSelectedKey === "2") { // "Todos itens"
                        // Crie os filtros para "key 1" e "key 3"
                        var oFilterKey1 = new sap.ui.model.Filter("s_status", "EQ", "1");
                        var oFilterKey3 = new sap.ui.model.Filter("s_status", "EQ", "3");
        
                        // Combine os filtros com a l�gica OR
                        var oCombinedFilter = new sap.ui.model.Filter({
                            filters: [oFilterKey1, oFilterKey3],
                            and: false // "OR" logic
                        });
        
                        // Log do filtro combinado
                        console.log("Filtro combinado (Todos itens):", oCombinedFilter);
        
                        // Adicione o filtro combinado aos par�metros de binding
                        oBindingParams.filters.push(oCombinedFilter);
        
                    } else if (sSelectedKey) {
                        // Para outras chaves, crie um filtro simples
                        var oNewFilter = new sap.ui.model.Filter("s_status", "EQ", sSelectedKey);
        
                        // Log do filtro criado
                        console.log("Filtro criado:", oNewFilter);
        
                        // Adicione o filtro simples aos par�metros de binding
                        oBindingParams.filters.push(oNewFilter);
                    }
                }
                // Acesse o controle customizado (ComboBox) para o filtro "ledger"
            var oCustomControlLedger = oSmartFilterBar.getControlByKey("ledger");
            if (oCustomControlLedger) {
                // Obtenha o valor selecionado do ComboBox "Ledger"
                var sSelectedKeyLedger = oCustomControlLedger.getSelectedKey();
    
                // Log para verificar o valor selecionado
                console.log("Valor do filtro 'ledger' selecionado:", sSelectedKeyLedger);
    
                // Verifica o valor selecionado para "ledger"
                if (sSelectedKeyLedger) {
                    // Crie o filtro para "ledger"
                    var oNewFilterLedger = new sap.ui.model.Filter("s_ledger", "EQ", sSelectedKeyLedger);
    
                    // Log do filtro criado
                    console.log("Filtro criado (ledger):", oNewFilterLedger);
    
                    // Adicione o filtro simples de ledger aos par�metros de binding
                    oBindingParams.filters.push(oNewFilterLedger);
                }
            }
 }

        }
        
    };
});
