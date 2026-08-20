/* app.js */
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const num = id => Number($(id).value) || 0;
  const euro = n => new Intl.NumberFormat("de-DE",{
    style:"currency",currency:"EUR",maximumFractionDigits:0
  }).format(Number(n)||0);

  function tabs(id){
    document.querySelectorAll(".page").forEach(x =>
      x.classList.toggle("hidden",x.id!==id)
    );
    document.querySelectorAll(".tab").forEach(x =>
      x.classList.toggle("active",x.dataset.tab===id)
    );
  }

  document.querySelectorAll(".tab").forEach(x =>
    x.addEventListener("click",()=>tabs(x.dataset.tab))
  );

  function data(){
    return {
      model:$("model").value,
      hsn:$("hsn").value,
      tsn:$("tsn").value,
      buyPrice:num("buyPrice"),
      buyDate:$("buyDate").value,
      buyKm:num("buyKm"),
      currentKm:num("currentKm"),
      annualKm:num("annualKm"),
      consumption:num("consumption"),
      fuelPrice:num("fuelPrice"),
      insurance:num("insurance"),
      tax:num("tax"),
      repairs:num("repairs"),
      resale:num("resale"),
      highway:num("highway"),
      country:num("country"),
      city:num("city"),
      targetYears:num("targetYears"),
      replacementBudget:num("replacementBudget"),
      replacementTarget:num("replacementTarget"),
      reserve:num("reserve")
    };
  }

  function calculate(){
    const d=data();

    if(d.highway+d.country+d.city!==100){
      alert("Dein Fahrprofil muss zusammen genau 100 % ergeben.");
      return;
    }

    if(d.currentKm<d.buyKm){
      alert("Der aktuelle Kilometerstand darf nicht kleiner als der Kilometerstand beim Kauf sein.");
      return;
    }

    const fuel=d.annualKm*d.consumption/100*d.fuelPrice;
    const fixed=d.insurance+d.tax;
    const annual=fuel+fixed;

    const km240=Math.max(0,240000-d.currentKm);
    const km300=Math.max(0,300000-d.currentKm);

    const years240=d.annualKm?km240/d.annualKm:0;
    const years300=d.annualKm?km300/d.annualKm:0;

    let title="🟢 Weiterfahren";
    let cls="green";
    let text="Bei deinem Ziel, möglichst günstig zu fahren, ist ein sofortiger Wechsel momentan wirtschaftlich schwer zu rechtfertigen.";

    if(d.currentKm>=300000){
      title="🟠 Wechsel vorbereiten";
      cls="amber";
      text="Ab 300.000 km solltest du größere Reparaturen besonders kritisch gegen einen Ersatzwagen rechnen.";
    }else if(d.currentKm>=270000){
      title="🟡 Weiterfahren & Wechsel beobachten";
      cls="amber";
      text="Weiterfahren kann noch sinnvoll sein, aber größere Reparaturen solltest du jetzt genauer bewerten.";
    }else if(d.currentKm>=240000){
      title="🟢 Weiterfahren & Zustand beobachten";
      text="Der Wagen kann weiterhin wirtschaftlich sein. Ab etwa 240.000 km sollte der technische Zustand stärker in die Entscheidung einfließen.";
    }

    $("result").className="result "+cls;
    $("result").innerHTML=`
      <strong>${title}</strong>
      <p>${text}</p>
      <div class="metrics">
        <div><b>${euro(annual)}</b><small>Basis-Kosten/Jahr</small></div>
        <div><b>${years240.toFixed(1)} J.</b><small>bis 240.000 km</small></div>
        <div><b>${years300.toFixed(1)} J.</b><small>bis 300.000 km</small></div>
      </div>
      <p>Bei ${d.annualKm.toLocaleString("de-DE")} km/Jahr erreichst du 300.000 km voraussichtlich in ${years300.toFixed(1)} Jahren.</p>
    `;

    $("heroDecision").textContent=title.replace(/^.[^ ]* /,"");
    $("heroText").textContent=`${d.currentKm.toLocaleString("de-DE")} km · ${euro(annual)} Basis-Laufkosten/Jahr`;
    $("heroProgress").style.width=Math.min(100,Math.max(0,(d.currentKm-150000)/1500))+"%";
  }

  function repair(){
    const d=data();
    const cost=num("repairCost");
    const life=num("repairLife");
    const ratio=d.resale?cost/d.resale:1;

    let title="🟢 Reparieren",cls="green";

    if(cost>2500){
      title="🔴 Eher verkaufen";cls="red";
    }else if(cost>1800){
      title="🟠 Verkauf ernsthaft prüfen";cls="amber";
    }else if(cost>1200){
      title="🟡 Einzelfall prüfen";cls="amber";
    }else if(cost>700){
      title="🟢 Eher reparieren";cls="green";
    }

    $("repairResult").className="result "+cls;
    $("repairResult").innerHTML=`
      <strong>${title}</strong>
      <p>${euro(cost)} entsprechen ${Math.round(ratio*100)} % deines aktuellen Fahrzeugwerts.
      Bei ${life} zusätzlichen Jahren sind das etwa ${euro(cost/life)} pro zusätzlichem Jahr.</p>
    `;

    $("mValue").textContent=euro(d.resale);
    $("mRepair").textContent=euro(cost);
    $("mRatio").textContent=Math.round(ratio*100)+" %";
  }

  function compare(){
    const d=data();

    const price=num("newPrice");
    const consumption=num("newConsumption");
    const tax=num("newTax");
    const insurance=num("newInsurance");
    const future=num("newFutureValue");

    const oldFuel=d.annualKm*d.consumption/100*d.fuelPrice;
    const newFuel=d.annualKm*consumption/100*d.fuelPrice;

    const old5=(oldFuel+d.insurance+d.tax)*5+d.repairs+500-Math.max(0,d.resale-500);
    const new5=(newFuel+insurance+tax)*5+price-future;

    const difference=new5-old5;

    $("old5").textContent=euro(old5);
    $("new5").textContent=euro(new5);
    $("diff5").textContent=euro(Math.abs(difference));

    $("compareText").className="result "+(difference<0?"green":"amber");
    $("compareText").innerHTML=`
      <strong>${difference<0?"🟢 Neues Auto günstiger":"🟡 Aktuelles Auto günstiger"}</strong>
      <p>Über fünf Jahre beträgt der modellierte Unterschied ${euro(Math.abs(difference))}.</p>
    `;
  }

  function saved(){
    try{return JSON.parse(localStorage.getItem("autolohnt")||"[]")}
    catch{return[]}
  }

  function renderSaved(){
    const list=$("savedList");
    const cars=saved();
    list.innerHTML="";

    if(!cars.length){
      list.innerHTML='<div class="result"><strong>Noch keine Autos gespeichert</strong><p>Speichere dein aktuelles Auto oder einen möglichen Ersatzwagen.</p></div>';
      return;
    }

    cars.forEach((car,i)=>{
      const el=document.createElement("div");
      el.className="saved";
      el.innerHTML=`
        <div>
          <strong>${escape(car.name)}</strong>
          <small>${(car.km||0).toLocaleString("de-DE")} km · ${euro(car.price)}</small>
        </div>
        <div>
          <button class="btn white" type="button" data-load="${i}">Laden</button>
          <button class="btn white danger" type="button" data-delete="${i}">×</button>
        </div>
      `;
      list.appendChild(el);
    });

    list.querySelectorAll("[data-delete]").forEach(b=>{
      b.addEventListener("click",()=>{
        const cars=saved();
        cars.splice(Number(b.dataset.delete),1);
        localStorage.setItem("autolohnt",JSON.stringify(cars));
        renderSaved();
      });
    });

    list.querySelectorAll("[data-load]").forEach(b=>{
      b.addEventListener("click",()=>{
        const car=saved()[Number(b.dataset.load)];
        Object.entries(car.data).forEach(([key,value])=>{
          if($(key))$(key).value=value;
        });
        tabs("current");
        calculate();
      });
    });
  }

  function save(){
    const d=data();
    const cars=saved();

    cars.unshift({
      name:d.model||"Mein Auto",
      price:d.buyPrice,
      km:d.currentKm,
      data:d
    });

    localStorage.setItem("autolohnt",JSON.stringify(cars.slice(0,20)));
    renderSaved();
    alert("Auto gespeichert.");
  }

  function saveNew(){
    const car={
      name:$("newModel").value||"Neues Auto",
      price:num("newPrice"),
      km:num("newKm"),
      data:{
        model:$("newModel").value,
        buyPrice:num("newPrice"),
        currentKm:num("newKm")
      }
    };

    const cars=saved();
    cars.unshift(car);
    localStorage.setItem("autolohnt",JSON.stringify(cars.slice(0,20)));
    renderSaved();
    alert("Auto gespeichert.");
  }

  function escape(value){
    return String(value).replace(/[&<>"']/g,c=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",
      '"':"&quot;","'":"&#039;"
    }[c]));
  }

  $("calculate").addEventListener("click",calculate);
  $("repairCheck").addEventListener("click",repair);
  $("compare").addEventListener("click",compare);
  $("save").addEventListener("click",save);
  $("saveNew").addEventListener("click",saveNew);

  $("heroCalc").addEventListener("click",()=>{
    tabs("current");
    calculate();
    $("current").scrollIntoView({behavior:"smooth"});
  });

  $("theme").addEventListener("click",()=>{
    const next=document.documentElement.dataset.theme==="dark"?"light":"dark";
    document.documentElement.dataset.theme=next;
    localStorage.setItem("autolohnt-theme",next);
  });

  $("reset").addEventListener("click",()=>{
    if(confirm("Alle aktuellen Eingaben zurücksetzen?"))location.reload();
  });

  $("clearSaved").addEventListener("click",()=>{
    if(confirm("Alle gespeicherten Autos löschen?")){
      localStorage.removeItem("autolohnt");
      renderSaved();
    }
  });

  document.documentElement.dataset.theme=
    localStorage.getItem("autolohnt-theme")||"light";

  renderSaved();
  calculate();
})();