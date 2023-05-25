import  {formatClass    }   from '/_lib/format/formatModule.js';
import  {proxyClass     }   from '/_lib/proxy/proxyModule.js'  ;
import  {dbClass        }   from '/_lib/db/dbModule.js'        ;
import  {tableUxClass   }   from '/_lib/UX/tableUxModule.js'   ;
import  {nodes2htmlClass}   from '/_lib/UX/nodes2htmlModule.js'   ;

class calendarClass {
  /*
   Calendar data is stored in a graph. Each graph has stores one year.  Edges hold dates and time and time zone.  Edges also hold if repeating information.  IE  weekly, monthly or yearly.
  
  High level methods are:
  
  //////////////////////////////// display methods
  constructor( // calendarClass  client-side
createDate
async loadEvents(
addEvents( 


  -----------
  main() is the starting point
  loadevents() loads the graph data and creates startGMT and endGMT attributes, and adds to this.events[mm][dd]
  buildTable() converts data from this.events[mm][dd] to table <this.db.getTable("weekCal")> for display in the weekly fromat
  addEvents()  creates all the repeating and non repeating events from the edge data.
    addWeekly(
    addMonthly(
    addOneOf(
  
  displayRow()    converts node to html for displayed
  displayEvent()  // user has clicked on a clalender event, show the details of the
  
  createDate(    // crates starting or endingdate for an event edge
  updatePictures(list)    // walk through each row and display the next picture
  HTMLforNode(  //
   A users will see the events in their timezone.
   This may not only change the time but also the day, month or year for the viewer of the events
  
   ///////////////////////////////////// edit methods
   createNewEvent  -> addNewEvent(
  
   editEvent -> save(
    fillFormFromData  // move data from graph.json to form
  
  popUpFormVisible
   createEditForm
  */
  
   #appRef 
  
  constructor( // calendarClass  client-side
    dom
    ,appRef    // how ui calls this class
  ) {
      this.DOM     = dom;
      this.#appRef = appRef;
      const today  = new Date();
  
      this.year  = today.getFullYear();
      this.month = today.getMonth();
      // need more though, this is here because calendar class has hardcoded this.format and app.proxy, but I'm using calendarClass is a seperate page too.

      this.format     = new formatClass();  // format time and dates
      this.proxy      = new proxyClass();   // loads graph data from server
      this.urlParams  = new URLSearchParams( window.location.search );  // read params send in the URL
  
      this.timezones = {"ET":-300, "CT":-360, "MT":-420, "PT":-480};
  
      this.eventYear;          // year of event to edit or add
      this.eventMonth;         // month of event to edit or add
      this.eventDay;           // day of event to edit or add
      this.eventData;          // number to access node or edge in data
      this.popUpHeight;        // holds the height of the pop up form
      this.numMonthDates = 4;  // holds number of dates a monthly repeating date can repeat on per month
      this.openMonthDates = 1; // number of selectors visible when monthly repeating option is chosen
      this.canSubmit = false;  // determines whether or not the form is ready to submit
      this.formHeight = "680px";
  
      // need for both sfc web site and the stand alone page
      this.db      = new dbClass();       // create empty database
      this.db.tableAdd("weekCal");        // create empty table in database, is where events for calendar will be displayed.
  
      // tableUxClass("calendar"  is hardcoded, change at some point
      this.tableUx = new tableUxClass(dom,`${this.#appRef}.tableUx`); // create way to display table
      this.tableUx.setModel( this.db, "weekCal");                  // associate data with disply widget
      this.tableUx.paging.lines = 3;    // should use a method to do this
      this.windowActive = false;        // toggle for pop up window
      this.tableUx.setStatusLineData( [
        `<input type="button" id="todayButton" onClick="${this.#appRef}.findToday()" value="Today" />`
        ,"nextPrev"
        ,`<select name="months" id="months" onChange="${this.#appRef}.chooseMonth()">
            <option value="nullMonth" selected>Choose Month</option>
            <option value="january">January</option>
            <option value="february">February</option>
            <option value="march">March</option>
            <option value="april">April</option>
            <option value="may">May</option>
            <option value="june">June</option>
            <option value="july">July</option>
            <option value="august">August</option>
            <option value="september">September</option>
            <option value="october">October</option>
            <option value="november">November</option>
            <option value="december">December</option>
          </select>`
        ,`rows/page: <input type="number" min="1" max="10" size=3 value="${this.tableUx.paging.lines}" onchange="${this.#appRef}.tableUx.changePageSize(this)"/>`
  
  
      ]);  // ,"tableName","rows","rows/page","download","tags", "firstLast"
  
      this.tableUx.setSearchVisible(false);                 // hide search
      this.tableUx.setLineNumberVisible(false);             // hide row line numbers
      this.tableUx.setRowNumberVisible(false);              // hide row numbers
  
      this.weeks2display = 2;                              // display 4 weeks of data at a time
      this.graph=null;                         // where the events are stored in compact form
      this.n_pic = 0;
  
      // init every day with empty array
      this.events = []                  // this.events[1][12] for january 12 a list of event nodes for that day - expanded from graph
      for (let m=1; m<=12; m++) {
        this.events[m]=[]
        for (let d=1; d<=31; d++) {
          this.events[m][d] = [];
        }
      }
  }
  
  
// Mutators
setEventMonth(    val) {this.eventMonth  = val;   } // calendarClass  client-side
setEventYear(     val) {this.eventYear   = val;   }// calendarClass  client-side
setEventDay(      val) {this.eventDay    = val;   }// calendarClass  client-side
setEventEdge(     val) {this.eventEdge   = val;   }// calendarClass  client-side
setPopUpHeight(   val) {this.popUpHeight = val;   }// calendarClass  client-side
setNumMonthDates( val) {this.numMonthDates = val; }// calendarClass  client-side
setOpenMonthDates(val) {this.openMonthDates = val;}// calendarClass  client-side
setCanSubmit(     val) {this.canSubmmit = val;    }// calendarClass  client-side
setFormHeight(    val) {this.formHeight = val;    }// calendarClass  client-side

  
// accessors
getEventMonth(    ) {return this.eventMonth ;   }// calendarClass  client-side
getEventYear(     ) {return this.eventYear  ;   }// calendarClass  client-side
getEventDay(      ) {return this.eventDay   ;   }// calendarClass  client-side
getEventEdge(     ) {return this.eventEdge  ;   }// calendarClass  client-side
getPopUpHeight(   ) {return this.popUpHeight;   }// calendarClass  client-side
getNumMonthDates( ) {return this.numMonthDates; }// calendarClass  client-side
getOpenMonthDates() {return this.openMonthDates;}// calendarClass  client-side
getCanSubmit(     ) {return this.canSubmit;     }// calendarClass  client-side
getFormHeight(    ) {return this.formHeight;    }// calendarClass  client-side
  
  
async main( // calendarClass  client-side
) {
  // decide which calendar to load, users or main
  await this.loadEvents( `events/${this.year}/_graph.json` );

  // display event or calendar
  this.edgeName = this.urlParams.get('e');
  if (this.edgeName === null) {
    // display entire calendar
    this.buildTable();  // convert edge data to table data that can be displayed

    // create a text month list
    // concatenate the month to the display
    const month = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    if (document.getElementById("heading")) {
      document.getElementById("heading").innerHTML += ` ${this.year}` + ` ${month[this.month]}`;
    } else {
      // assume it is the main page
      document.getElementById("heading1").innerHTML += ` ${this.year}`;
    }

    this.tableUx.display();
    this.findToday();   // only need to do this is we are displaying the clander
    document.getElementById("weeks").innerHTML += await app.proxy.getText("/synergyData/calendar/calendarForm.html");
  } else {
    // display event in calendar
    await this.displayEvent();
  }
}
  
  
  createDate(  // calendarClass  client-side
    // returns a date  a starting or ending date for an event edge
     edge  //
    ,end  //  true -> end time, add duration to start
    ,offsets = [0,0,0] // offset from start [yy,mm,dd]
  ) {
    let offset = this.timezones[edge.timeZone] + new Date(0).getTimezoneOffset();  // get offset from event timezone vs user timezone
    let timeDuration = edge.timeDuration.split(":");                         // timeDuration[0] is hours  timeDuration[1] is minutes
    if (end) {
      // date that events ends
      return new Date(edge.dateEnd[0]   ,edge.dateEnd[1]-1  , edge.dateEnd[2]  , edge.dateStart[3]+ parseInt(timeDuration[0]) , edge.dateStart[4] - offset + parseInt(timeDuration[1]) );
    } else {
      // date that events starts
      return new Date(edge.dateStart[0] +offsets[0] ,edge.dateStart[1]-1 +offsets[1], edge.dateStart[2] +offsets[2], edge.dateStart[3], edge.dateStart[4] - offset);
    }
  }
  
  
  async loadEvents( // calendarClass  client-side
    url
  ) {
    // load calendar data
    let dir;
    if ( app.login.getStatus()) {
      dir = `users/`; // display user calendar
    } else {
      dir = "synergyData/"; // display web calendar
    }
    
    this.url   = dir+url;
    this.graph = await app.proxy.getJSON(this.url);
  
    // each edge will generate at least one element in and event list
    Object.keys(this.graph.edges).forEach((k, i) => {
      // generate startGMT, endGMT
      let e = this.graph.edges[k];  // edge we are processing
      e.startGMT = this.createDate(e,false);  // start date time
      e.endGMT   = this.createDate(e,true );  // end   date time
      this.addEvents(k);
    }); // end Object.keys forEach
  }
  
  
  addEvents(  // calendarClass  client-side
    k  // this.graph.edges[k] returns the edge
  ) {
    switch(this.graph.edges[k].repeat) {
      case "weekly":
        this.addWeekly(k)
        break;
      case "monthly":
        this.addMonthly(k)
        break;
      case "yearly":
        this.addOneOf(k);
        break;
      case "never":
        this.addOneOf(k);
        break;
      default:
        if (typeof(this.graph.edges[k].repeat) === "undefined") {
          // does not repeat
          this.addOneOf(k);
        } else {
          // error
          alert(`in calendarClass.addEvents: repeat=${this.graph.edges[k].repeat}  k=${k}`);
        }
    }
  }
  
  
  addOneOf(  // calendarClass  client-side
    k  // this.graph.edges[k] returns the edge
  ){
    const date=this.graph.edges[k].startGMT
    this.events[date.getMonth()+1][date.getDate()].push(k);  // push key to edge associated with edge
  }
  
  
  addMonthly(  // calendarClass  client-side
    k  // this.graph.edges[k] returns the edge
  ) {
    // walk the daysOffset, first entry should be 0;
    const edge=this.graph.edges[k];
    let i=0;
    for ( let month = new Date(edge.startGMT.getTime()); month < edge.endGMT;  ) {
      // chang
      edge.days.forEach((day, i) => {  // day=[day number, week number] day number 0 -> sunday     :  [1,2] -> second monday of month
        // find first target day of week in the the month
        let offset = day[0] - month.getDay(); // day[0] is the target day of week
        if (offset<0) {offset += 7;}          // target day of week in in the next week
        if (day[1] != 5) {
          offset += 7*(day[1]-1);               // move to correct on ie 1st, 2st, 3rd... day of week of the month
        } else {
          // day repeats on last day of the month
          // day is either on the 4th or 5th day for each month
          let d = this.findDayInWeek(month.getMonth()+1,day[0]); // find the first day of the week of the next month
          d.setDate(d.getDate() - 7);                            // subtract a week to get last day of week of this month
          let n = this.findDayInMonth(d);                        // find if it is the 4th of 5th instance of day of the week in the month
          offset += 7*(n[1]-1);                                  // calculate offset
        }
        let eventDate = new Date(month.getTime() + offset*1000*60*60*24);
        this.events[eventDate.getMonth()+1][eventDate.getDate()].push(k);  // push key to edge associated with edge
      });
      // goto next month
      month=this.createDate(edge,false,[0,++i,0]);
    }
  }
  
  findDayInWeek(
    // Returns a Date object of the first instance of day of week in a month
    // ex -- returns the first tuesday in january
    month,
    day
  ) {
    var d = new Date(this.year,month,1); // set day for first day in month
  
    // walk until we find first instance of day of week in the month
    while (d.getDay() != day) {
      console.log('day ' + d.getDay());
      d.setDate(d.getDate() + 1);
    }
  
    return d;
  }
  
  addWeekly( // calendarClass  client-side
    k  // this.graph.edges[k] returns the edge
  ) {
    // walk the daysOffset, first entry should be 0;  we assume
    const edge = this.graph.edges[k];
    edge.daysOffset.forEach((day, i) => {  // day=0 -> sunday
       let walk = new Date(edge.startGMT.getTime() + day*1000*60*60*24);
       while (walk <= edge.endGMT) {
          this.events[walk.getMonth()+1][walk.getDate()].push(k);  // push key to edge associated with edge
          walk.setDate(walk.getDate() + 7);                        // add seven days, goto the next week
       }
    });
  }
  
  buildTable(  // calendarClass  client-side
  ) {   // converts calendar data from graph to a table
    const t        = this.db.getTable("weekCal");  // t -> table we will put event data in to display
    t.clearRows();
    t.setHeader( ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday "] );
  
    const today = new Date();
    const start = new Date(this.year, 0, 1);   // current date/time
    const firstDate = new Date(this.year, 0, 1);
    const year = start.getFullYear();
    start.setDate( start.getDate()  - start.getDay() ); // move start to Sunday, year could change if it is the first week of the year
  
    // build weeks data to end of year
    let style;
    for (let x=0; start.getFullYear()<=year ;x++) {
      let row = []; // init week
      for (let y=0; y<=6; y++) {
        // add days for week
        let m = start.getMonth()+1;
        let d = start.getDate();
  
        // set style of day depending on not part of current year, past, today, future,
        if (start<firstDate) {
          // day is before january 1st of this year
          style = `data-parentAttribute="['class','notYear']"`
        } else if (start.getFullYear()>this.year) {
          // day is after last day of year
          style = `data-parentAttribute="['class','notYear']"`
        } else if (start.getMonth() == today.getMonth() && start.getDate() == today.getDate() && start.getFullYear() == today.getFullYear()) {
          // change how the comparison works because the time of day will not match up from start and today
          // so just see if the month, day, and year are the same to compare
          // set backgroupd color for today
          let dayArg   = start.getDate();
          let monthArg = start.getMonth();
          let yearArg  = start.getFullYear();
          style = `data-parentAttribute="['class','today']"`  // tableUxClass will put class='past' in the TD tag
        } else if (start<today) {
          // set backgroupd color for past event
          let dayArg   = start.getDate();
          let monthArg = start.getMonth();
          let yearArg  = start.getFullYear();
          style = `data-parentAttribute="['class','past']"`  // tableUxClass will put class='past' in the TD tag
        } else {
          // set backgroupd color for future date
          let dayArg   = start.getDate();
          let monthArg = start.getMonth();
          let yearArg  = start.getFullYear();
          style = ''
        }
  
        let add="";
        //if (this.urlParams.get('u') != null) {
        if (app.login.getStatus()) {
          // user calendar
          add =`<a onClick="${this.#appRef}.createNewEvent(${start.getFullYear()}, ${start.getMonth()}, ${start.getDate()})">+</a> `
        }
        let html = `<h5 ${style}>${m}-${d} ${add}</h5>`;
  
        let eventList = this.events[m][d];
        eventList.forEach((edgeName, i) => {
          // loop for all events for day [m][d]
            let year = start.getFullYear();
            let nodeName = this.graph.edges[edgeName].nR
  
            let user=""  // assume we are on main calendar
            let editButton = `${i+1} `;
            if (app.login.getStatus()) {
              // we are on a user calendar
              //user = "&u=" + this.urlParams.get('u');
              editButton = `<a onClick="${this.#appRef}.editEvent(${edgeName})">${i+1}</a> `;
            }
            
            let repeat_color = "";
            let repeat_class = ""; 
            /* 
              weekly = blue
              monthly = yellow
              yearly = black
            */
  
            if (typeof(nodeName) === "string") {
              // assume node is an interal node
              if(this.graph.edges[edgeName].repeat == "weekly") {
                // repeat_color = "blue";
                repeat_class = "repeat_weekly";
              }
              else if(this.graph.edges[edgeName].repeat == "monthly") {
                // repeat_color = "red";
                repeat_class = "repeat_monthly";
              }
              else if(this.graph.edges[edgeName].repeat == "yearly") {
                // repeat_color = "black";
                repeat_class = "repeat_yearly";
              }
              else {
                repeat_color = "";
              }
  
              html += `<p>${editButton}<a  href="/app.html?p=${app.page}&e=${edgeName}&d=${this.format.getISO(start)}${user}" target="_blank" class="${repeat_class}">${this.graph.nodes[nodeName].text[0][2]}</a></p>`
            } else {
              // assume nodeName is an Object
              if(this.graph.edges[edgeName].repeat == "weekly") {
                repeat_color = "blue";
              }
              else if(this.graph.edges[edgeName].repeat == "monthly") {
                repeat_color = "red";
              }
              else if(this.graph.edges[edgeName].repeat == "yearly") {
                repeat_color = "black";
              }
              else {
                repeat_color = "";
              }
  
              html += `<p>${editButton}<a  href="${nodeName.url}" target="_blank" style="color: ${repeat_color}">${nodeName.text}</a></p>`
            }
        });
  
        row.push(html + "</br>")
        start.setDate( start.getDate() + 1 ); // move to next day
      }
      t.appendRow(row);  // append row to table
    }
  }
  
  
  fillFormFromData(  // calendarClass  client-side
    // fills in pop up form from the JSON data
    edgeName
  ) {
    // load from edge ------------
    const edge = this.graph.edges[edgeName];
    const dateStart = edge.dateStart;
    document.getElementById("eventStartDate").value =
         `${dateStart[0]}-${this.format.padZero(dateStart[1],2)}-${this.format.padZero(dateStart[2],2)}`
    document.getElementById("eventStartTime").value = `${this.format.padZero(dateStart[3],2)}:${this.format.padZero(dateStart[4],2)}`;
  
    document.getElementById("repeatType"    ).value = edge.repeat;
  
    document.querySelector('#timeZone').value = edge.timeZone;
  
    // fill in duration of event
    const durTimeData = edge.timeDuration.split(":");
    document.getElementById("durationHour"  ).value = parseInt(durTimeData[0]);
    document.getElementById("durationMinute").value = parseInt(durTimeData[1]);
  
    // fill in end date of event
    this.renderEndDateSelector();
    document.getElementById("endDateInput").valueAsDate = new Date(
        edge.dateEnd[0]
        ,edge.dateEnd[1]-1
        ,edge.dateEnd[2]
      );
  
    // fill in what days the event repeats on
    this.fillRepeatdays();
  
    // fill in days monthly events repeat on
    if (edge.repeat == "monthly") {
      document.getElementById("monthlyEndDateSelect").value = edge.dateEnd[1]; // fill in end month selector
      for (let i = 0; i < edge.days.length; i++) {
        if (i > 0) this.addNewRepeatMonthy();
        document.getElementById(`monthlyWeekSelect-${i+1}`).value = edge.days[i][1];
        document.getElementById(`monthlyDaySelect-${i+1}` ).value = edge.days[i][0];
      }
    }
  
    // load from node  ----------
    document.getElementById("eventName"       ).value     = this.graph.nodes[edge.nR].text[0][2];
    document.getElementById("eventDescription").value = this.graph.nodes[edge.nR].text[1][2];
  }
  
  
  fillRepeatdays(  // calendarClass  client-side
    // fills in the selector for what days of the week the event repeats on
  ) {
    let edgeName = this.getEventEdge();
    // the edge exists already
    let d = new Date(
       this.graph.edges[edgeName].dateStart[0]
      ,this.graph.edges[edgeName].dateStart[1]-1
      ,this.graph.edges[edgeName].dateStart[2]
    );
    let dayIndex = d.getDay();
    let r = this.graph.edges[edgeName].daysOffset;
    let daysOfWeek = document.getElementsByClassName("repeatCheckbox");
    for (let i = 0; i < r.length; i++) {
      daysOfWeek[(r[i] + dayIndex) % 7].checked = true;
    }
  }
  
  closeForm(  // calendarClass  client-side
    // closes pop up window
  ) {
  
    // ensure all monthly repeat selectors are deleted
    // so that when it is reopened there is no overlap
    document.getElementById("popUpForm").style.height = this.getFormHeight();  // ensure pop up form has original height
    let monthlySelectors = document.getElementsByClassName("monthlyRepeatInput");
    for (let i = monthlySelectors.length; i > 1; i--) {
      document.getElementById(`monthlyRepeatInput-${i}`).remove();
    }
    this.setOpenMonthDates(1);
  
    this.popUpFormVisible(false);
  }
  
  addNewRepeatMonthy(  // calendarClass  client-side
    // This function is the onClick function for the '+' button on popupform when the 'monthly' repeating option is chosen
    // This adds a new day in the month that the event can repeat on
    // Currently maxing it at 3 dates it can repeat on
  ) {
    // Make sure we are not at maximum amount of dates
    if (this.getOpenMonthDates() <= 3){
      // We need to expand how large the total pop up is to fit the new items
      document.getElementById("popUpForm").style.height = `${document.getElementById("popUpForm").clientHeight + 35}px`;
  
      // Append new selector to repeat on
      // document.getElementById(`monthlyRepeatInput-${this.getOpenMonthDates()+1}`).style.display = "block";
      let weekValues = [
         '1st'
        ,'2nd'
        ,'3rd'
        ,'4th'
        ,'5th'
      ];
      let dayValues = [
         'Sunday'
        ,'Monday'
        ,'Tuesday'
        ,'Wednesday'
        ,'Thursday'
        ,'Friday'
        ,'Saturday'
      ];
  
      let fragment = document.createDocumentFragment();
      let container = document.createElement('div');
      container.className = "monthlyRepeatInput";
      container.id = `monthlyRepeatInput-${this.getOpenMonthDates()+1}`;
      let label = document.createElement('a');
      label.textContent = `${this.getOpenMonthDates()+1}`;
      let weekSelector = document.createElement('select');
      for (let i = 0; i < weekValues.length; i++) { // walk through week array and create option tags for the weekSelector select tag and insert it
        let option = document.createElement('option');
        option.value = `${i+1}`;
        option.innerText = weekValues[i];
        weekSelector.appendChild(option);
      }
      weekSelector.id = `monthlyWeekSelect-${this.getOpenMonthDates()+1}`;
      let daySelector = document.createElement('select');
      for (let i = 0; i < dayValues.length; i++) { // walk through array of days of week and fill daySelector with them
        let option = document.createElement('option');
        option.value = `${i}`;
        option.innerText = dayValues[i];
        daySelector.appendChild(option);
      }
      daySelector.id = `monthlyDaySelect-${this.getOpenMonthDates()+1}`;
      let removeButton = document.createElement('a');
      removeButton.setAttribute('onclick', `${this.#appRef}.removeMonthlySelector(${this.getOpenMonthDates()+1})`)
      removeButton.className = 'removeMonthlySelectorButton';
      removeButton.innerText = '-';
      container.appendChild(label);
      container.appendChild(weekSelector);
      container.appendChild(daySelector);
      container.appendChild(removeButton);
      fragment.appendChild(container);
  
      document.getElementById("monthlyEndDate").appendChild(fragment);
  
      this.setOpenMonthDates(this.getOpenMonthDates()+1);
    } else {
      console.log("Maximum amount of dates");
    }
    console.log(this.getOpenMonthDates());
  }
  
  removeMonthlySelector(  // calendarClass  client-side
    // This function is the onclick for the '-' that appears next to the selectors when user is choosing the monthly repeat option
    // This removes the selector that it is attached to and resizes the pop up window
    index
  ) {
    // document.getElementById(`monthlyRepeatInput-${index}`).style.display = "none";
    document.getElementById(`monthlyRepeatInput-${index}`).remove();
    document.getElementById("popUpForm").style.height = `${document.getElementById("popUpForm").clientHeight - 35}px`;
    this.setOpenMonthDates(this.getOpenMonthDates() - 1);
    console.log(this.getOpenMonthDates());
  }
  
  
  createNewEvent(  // calendarClass  client-side
    // user clicked + to add new event on a particular day
     year
    ,month
    ,day          //
  ) {
    // determine if we are on user calendar or
    if (!app.login.getStatus()) {
      // not on user calendar
      alert('Error, not on user calendar');
      return;
    }
  
    // set member variables for event year month and day
    this.setEventYear(year);
    this.setEventMonth(month);
    this.setEventDay(day);
  
    // Set correct buttons to display for creating new event
    document.getElementById("saveEventButton"  ).style.display  = "none";
    document.getElementById("deleteEventButton").style.display  = "none";;
    document.getElementById("addEventButton"   ).style.display  = "inline-block";
  
    // make form blank
    this.createBlankForm();
  
    // make popup vissible
    this.popUpFormVisible(true);
  }
  
  
  createBlankForm(  // calendarClass  client-side
    // sets all input fields in pop up form to be default
  ) {
    // fill in all selector values
    // empty name field
    document.getElementById("eventName").value = "";
  
    // empty URL field
    document.getElementById("eventURL").value = "";
  
    // empty description field
    document.getElementById("eventDescription").innerText = "";
  
    // set start date to the chosen day they clicked on
    let date = new Date(this.getEventYear(),this.getEventMonth(),this.getEventDay());
    document.getElementById('eventStartDate').value = date.toISOString().substring(0,10);
  
    // load time with current time
    date = new Date();
    document.getElementById('eventStartTime').value = date.toISOString().substring(11,16);
  
    // set default time zone
    let timezone = new Date(0).getTimezoneOffset(); // find timezone offset from GMT
    let keys = Object.keys(this.timezones); // create array of the keys which are the timezones we account for
    keys.forEach((key, index) => { // walk through array of timezones and if it matches then we set the default value to it
      if (this.timezones[key] === -timezone) {
        document.getElementById("timeZone").value = key;
      }
    });
  
    // ensure pop up form has original height
    document.getElementById("popUpForm").style.height = this.getFormHeight();
  
    // Ensure no monthly date selectors are open
    let monthlySelectors = document.getElementsByClassName("monthlyRepeatInput");
    for (let i = monthlySelectors.length; i > 1; i--) {
      document.getElementById(`monthlyRepeatInput-${i}`).remove();
    }
    this.setOpenMonthDates(1);
    document.getElementById("monthlyEndDateSelect").value = this.getEventMonth()+2; // default the month the event will end on to the month after the one selected
  
    // Defaults event repeat type to 'never' repeating
    document.getElementById("repeatType").value = "never"; // default repeat to 'never'
    this.renderEndDateSelector(); // render details for type of repeating
  
    // set default for weekly repeating
    for (let i = 0; i < document.getElementsByClassName("repeatCheckbox").length; i++) {
      // clear the checkboxes for weekly repeating events
      document.getElementsByClassName("repeatCheckbox")[i].checked = false;
    }
  
    // set default monthly repeating
    // ex -- 4th wednesday
    let d = this.findDayInMonth(
      new Date(
         this.getEventYear()
        ,this.getEventMonth()
        ,this.getEventDay()
      )
    );
    document.getElementById("monthlyWeekSelect-1").value = `${d[1]}`;
    document.getElementById("monthlyDaySelect-1").selectedIndex = d[0];
  
    // set default yearly repeating
    document.getElementById("yearlyEndDateInput").value = `${this.year + 1}`;
  
    // set default duration to one hour
    document.getElementById("durationHour"  ).value = 1;
    document.getElementById("durationMinute").value = 0;
  }
  
  
  editEvent(  // calendarClass  client-side
    edgeName  // string
  ) {
    if (!app.login.getStatus()) {
      // not on user calendar
      alert('Error, not on user calendar');
      return;
    }
  
    // save for other methods
    this.setEventDay(   this.graph.edges[edgeName].dateStart[2]     );
    this.setEventMonth( this.graph.edges[edgeName].dateStart[1]-1     );
    this.setEventYear(  this.graph.edges[edgeName].dateStart[0]     );
    this.setEventEdge(  edgeName                                    );
    console.log(this.eventDay);
    console.log(this.eventMonth);
    console.log(this.eventYear);
  
  
    // show/hide buttons
    document.getElementById("addEventButton"   ).style.display = "none";             // Hide
    document.getElementById("saveEventButton"  ).style.display = "inline-block";     // show ?
    document.getElementById("deleteEventButton").style.display = "inline-block";     // show ?
  
    this.popUpFormVisible(true    );   // make popup vissible
    this.fillFormFromData(edgeName);   // load data
  }
  
  
  popUpFormVisible(  // calendarClass  client-side
    bool  // true =show it,  false -> hide it
  ) {
    document.getElementById(`popUpForm`).style.display = bool ? 'block' : 'none';
  }
  
  
  renderEndDateSelector(  // calendarClass  client-side
  // renders the end date selector based on chosen selected value from the repeat selector in pop up form
  ) {
    let repeatSelector = document.getElementById("repeatType");
  
    if (repeatSelector.value == "never") {
      // do not display any selector when event does not repeat
      document.getElementById("yearlyEndDate"         ).style.display = 'none';
      document.getElementById("weeklyMonthlyEndDate"  ).style.display = 'none';
      document.getElementById("monthlyEndDate"        ).style.display = 'none';
      document.getElementById("daysOfWeekSelector"    ).style.display = 'none';
  
    } else if (repeatSelector.value == "yearly") {
      // display only a number when selecting a year
      document.getElementById("yearlyEndDate"         ).style.display = 'inline';
      document.getElementById("weeklyMonthlyEndDate"  ).style.display = 'none';
      document.getElementById("monthlyEndDate"        ).style.display = 'none';
      document.getElementById("daysOfWeekSelector"    ).style.display = 'none';
  
    } else if (repeatSelector.value == "weekly") {
      // weekly option is selected so we should display selector for end date
      // add options for what days to repeat on every week
      document.getElementById("yearlyEndDate"         ).style.display = 'none';
      document.getElementById("monthlyEndDate"        ).style.display = 'none';
      document.getElementById("weeklyMonthlyEndDate"  ).style.display = 'inline';
      document.getElementById("daysOfWeekSelector"    ).style.display = 'inline';
  
    } else if (repeatSelector.value == "monthly") {
      // monthly option is chosen to repeat
      document.getElementById("yearlyEndDate"         ).style.display = 'none';
      document.getElementById("weeklyMonthlyEndDate"  ).style.display = 'none';
      document.getElementById("monthlyEndDate"        ).style.display = 'flex';
      document.getElementById("daysOfWeekSelector"    ).style.display = 'none';
  
    }
  }
  
  validateForm(
    // This function makes sure that all the necessary fields of pop up form are filled in before the user can submit or save data
  ) {
    if (document.getElementById("eventName").value == "") {
      alert('Name of event not filled in');
      this.setCanSubmit(false);
      console.log("name");
    }
  
    if ((document.getElementById("repeatType").value == "monthly" || document.getElementById("repeatType").value == "weekly") && document.getElementById("endDateInput").value == "") {
      alert('End date of event not filled in');
      this.setCanSubmit(false);
      console.log("date");
    }
  
    this.setCanSubmit(true);
  }
  
  loadEventEdge( // calendarClass  client-side
                 // moves pop up form to edge for this.graph.edge[edge]
    edge // name of edge we are loading
  )   {
    // move data from form to variables
    const url           = document.getElementById("eventURL").value;         // url of the event
    const name           = document.getElementById("eventName").value;       // name of the event
  
  
    let   durationHour   = document.getElementById("durationHour"  ).value;  // hours portion how the duration
    let   durationMinute = document.getElementById("durationMinute").value;  // minutes portion of the duration
    const repeat         = document.getElementById("repeatType"    ).value;  // chosen value of how often to repeat event
  
    let year  = this.getEventYear();
    let month = this.getEventMonth();
    let day   = this.getEventDay();
  
    let endDate     = "";
    let doesRepeat  = false
    if (document.getElementById("endDateInput")) {
      endDate    = document.getElementById("endDateInput").value;
      doesRepeat = true;
    }
  
    const startTime  = document.getElementById("eventStartTime").value;  // the start time of the event
    let startHour   = startTime.split(":");
    // while (startHour[0][0] == "0") {
    //   startHour[0] = startHour[0].substring(1);
    // }
  
    // parse year month day from end date
    let endDateInfo  = endDate.split("-");
    let startHourNum = parseInt(startHour[0],10);
    let startHourMin = parseInt(startHour[1],10);
  
    // init duration
    if (durationMinute.length < 2                ) {durationMinute = "0" + durationMinute;}
    if (durationHour == "0" || durationHour == "") {durationHour = "1";}
  
    let startDate = [year, month+1, day, startHourNum,startHourMin];
  
    // handle repeat events
    let offset         = [];   // for repeating events and their offset from first day
    let days           = [];
    let dateEnd;
  
    // handle different cases for types of repeating
    if (repeat == "weekly") {
      // repeats weekly
      // find offset for desired days
      let d = new Date(year,month,day);
      let dayIndex = d.getDay();
      let repeatingDays = this.weeklyRepeatDays();
      for (let i = 0; i < repeatingDays.length; i++) {
        // walk through the days chosen to repeat on, and find distance between start day and chosen day
        let dif = repeatingDays[i] - dayIndex;
        if (dif < 0) {
          // day should repeat on day that happens before chosen day but only after chosen day
          // ex repeats on monday wednesday friday, but the event starts on wednesday, so first monday is after the first wednesday
          repeatingDays[i] += 7;
          offset.push(repeatingDays[i]-dayIndex);
        } else {
          // push the difference between indices into the offset
          offset.push(dif);
        }
      }
      if (repeatingDays.length == 0) {
        // if user did not choose days to repeat on, assume that it will repeat on same day every week
        offset = [0];
      }
      dateEnd = [parseInt(endDateInfo[0],10),parseInt(endDateInfo[1],10),parseInt(endDateInfo[2],10)];
      if (!document.getElementById("endDateInput").value) {
        // if end date field is left empty, then assume event ends one week after start
        dateEnd = [year,month+1,day+7];
      }
    } else if (repeat == "monthly") {
      // event is repeating monthly
      offset = [0];
      // dateEnd = [parseInt(endDateInfo[0],10),parseInt(endDateInfo[1],10),parseInt(endDateInfo[2],10)];
      let endMonth = document.getElementById("monthlyEndDateSelect").value;
      dateEnd = [this.getEventYear(), parseInt(endMonth), 1];
  
      // read input from the drop down boxes
      for (let i = 0; i < this.getNumMonthDates(); i++) {
        if (document.getElementById(`monthlyDaySelect-${i}`)) {
          days.push([document.getElementById(`monthlyDaySelect-${i}`).value,document.getElementById(`monthlyWeekSelect-${i}`).value]);
        }
      }
      startDate[2] = 1;
    } else if (repeat == "yearly") {
      offset = [];
      dateEnd = [parseInt(endDate,10),month+1,day];
    } else if (repeat == "never") {
      offset = [];
      dateEnd = [year,month+1,day];
    }
  
    // saving form data to the edge
    let g = this.graph.edges[edge];
    if (url == "") {
      g.dateStart    = startDate;
      g.dateEnd      = dateEnd;
  
      let e          = document.getElementById("timeZone");
      g.timeZone     = e.options[e.selectedIndex].value;
      g.days         = days;
      g.timeDuration = `${durationHour}:${durationMinute}`;
      g.repeat       = repeat;
      g.daysOffset   = offset;
    } else {
      let nR = {};
      nR.text = name;
      nR.url = url;
      g.nR = nR;
      g.dateStart    = startDate;
      g.dateEnd      = dateEnd;
  
      let e          = document.getElementById("timeZone");
      g.timeZone     = e.options[e.selectedIndex].value;
      g.days         = days;
      g.timeDuration = `${durationHour}:${durationMinute}`;
      g.repeat       = repeat;
      g.daysOffset   = offset;
    }
  
  }
  
  findDayInMonth(
    // This funciton returns an array with the first day being the index of the day in a week -- ex 0 for sunday and 1 for monday
    // The second element in array is the index of week in the month -- ex 1 for first week 2 for second week
    // EX: [2,4] would mean that the day is the 4th tuesday of the month
    date
  ) {
  
    let dayIndex = date.getDay();
    let weekIndex = Math.ceil(date.getDate() / 7);
    return [dayIndex , weekIndex];
  }
  
  
  async deleteEvent( // calendarClass  client-side
  ) {
    delete this.graph.edges[this.getEventEdge()];
    //delete this.graph.nodes[editData]; can only delete this if it is an orphan
  
    await this.processServerRefresh();
  }
  
  // When user hits "add event" or "save"
  // Handles the days of week that the event should repeat on
  // Returns array where each item is an index of day of the week starting at 0
  // ex [0,2,4] is [sunday, tuesday, thursday]
  weeklyRepeatDays() {
    // grab all checkboxes
    let options = document.getElementsByClassName("repeatCheckbox");
    let rv = [];
  
    // go through all the checkboxes for the days and push back the index if they are checked
    for (var i = 0; i < options.length; i++) {
      if (options[i].checked == true) {
        rv.push(i);
      }
    }
    return rv;
  }
  
  async save(   // calendarClass  client-side
    // user clicked edits existing event, and now has clicked saved
  ) {
    this.loadEventEdge(this.getEventEdge());
  
    const edge      = this.graph.edges[this.getEventEdge()];
    const node      = this.graph.nodes[edge.nR]
    node.text[0][2] = document.getElementById("eventName"       ).value;
    node.text[1][2] = document.getElementById("eventDescription").value;
  
    await this.processServerRefresh();
  }
  
  
  async addNewEvent(  // calendarClass  client-side
    // user click + to add a new event and now has click "add" button to save new event on server
    ) {
  
    // move values in pop up form to graph edge
    const edge = this.graph.edges[this.graph.edgeNext] = {};  // create new edge
    edge.nR    = this.graph.nodeNext.toString();
    this.loadEventEdge(this.graph.edgeNext);
  
    const node = this.graph.nodes[this.graph.nodeNext] = {};  // create new node
    
    // Changed node text to JSON style string
    node.text  = [
      ["h3","",JSON.stringify(`${document.getElementById("eventName"       ).value}`)]
      ,["p" ,"",JSON.stringify(`${document.getElementById("eventDescription"       ).value}`)]
    ];
  
    this.graph.edgeNext += 1;
    this.graph.nodeNext += 1;
  
    await this.processServerRefresh();  // save the updated calendar
  
  
  }
  
  async processServerRefresh( // calendarClass  client-side
  
  ) {
    // save new graph
    //const resp = await this.proxy.RESTpost(this.graph,this.url);
    const resp = await this.proxy.RESTpost(this.format.obj2string(this.graph),this.url);
    alert(JSON.stringify(resp));   // was it succussful
    location.reload();
    this.windowActive = false;

    /*
   buffer // create binary resource on server
  ,url = window.location.href // server, default to current server


    const msg = {
    "server":"web"
    ,"msg":"uploadFile"
    ,"path":`/users/myWeb/events/${this.year}`
    ,"name":"_graph.json"
    ,"data": this.format.obj2string(this.graph)
    }
  
    const resp = await app.proxy.postJSON(JSON.stringify(msg));  // save
    alert(JSON.stringify(resp));   // was it succussful
    location.reload();
    this.windowActive = false;
    */
  }
  
  
  moveToDate( // calendarClass  client-side
     newDate // move to newDate from current date displayed on calendar
  ) {
    let timeBetweenDays;  // in milliseconds from newDate to first date displayed in first row
    let weeksBetweenDays; // number of rows need to move to make the newDate displayed in first row of calendar
    const firstDayTD    = document.getElementsByTagName("td")[0];      // grabs the table elements that hold the dates on calendar
    const firstMonthDay = firstDayTD.firstChild.innerText.split("-");  // grabs the first date at the top left of calendar table
  
    // convert strings to integers
    const firstMonth = parseInt(firstMonthDay[0]);
    const firstDay   = parseInt(firstMonthDay[1])
  
    // first date of page we are on at the moment
    const firstYear = (this.tableUx.paging.row ===0 && firstDayTD.className === "notYear") ? (this.year-1) : this.year;
    const firstDate = new Date(firstYear, firstMonth-1, firstDay);
  
    // find difference in time between dates
    timeBetweenDays = newDate.getTime() - firstDate.getTime(); // time between a and b in milliseconds
  
    // turn difference in milliseconds to weeks
    weeksBetweenDays = Math.floor(timeBetweenDays / (1000 * (60 * 60) * 24 * 7));
  
    // change paging row
    this.tableUx.paging.row += weeksBetweenDays;
    this.tableUx.displayData();
  }
  
  
  chooseMonth(  // calendarClass  client-side
    // Goes to page that has first day of chosen month
  ) {
    const myList = document.getElementById("months");           // grabs the month input selector
    this.moveToDate(new Date(this.year, myList.selectedIndex-1, 1));
    myList.selectedIndex = 0;
  }
  
  
  findToday( // calendarClass  client-side
  // jumpts to current date from anywhere on calendar
  ) {
    // get current date (we want to jump to this date)
    var today = new Date();
  
    this.moveToDate(today);
  }
  
  
  async displayEvent()  // calendarClass - client-side
  {
    // display single event
    const list     = [];         // will contain list of nodes to display
    const nodeName = this.graph.edges[this.edgeName].nR; // get the main nodeName or object
    const date     = this.urlParams.get('d')             // get YYYY-MM-DD from the URL
    const startTime = new Date(this.graph.edges[this.edgeName].startGMT);  // Create new date object with the event start time
   
    // Create a formatted version of the start time using the formatClass
    const formattedStartTime = `<p>Start Time: ${this.format.timeFormat(startTime)} </p>`;
  
    list.push(nodeName+date);    // push node for this date, display it first, this nodeName may not exist
    list.push(nodeName);         // push the main node to display
  
    const nodes2html = new nodes2htmlClass(this.graph.nodes, this.DOM, this.graph.edges[this.edgeName]);
    await nodes2html.displayList(list);
  
    // add date to heading & formatted start time below the description
    document.getElementById('heading1').innerHTML  = "SFC Event On: " + date;
    document.getElementById('main'    ).innerHTML += formattedStartTime;
  }
  
  validateMinuteDuration(
    // Validates the entered minute value within the popup 
    e
    ) {
      // Check the value is greater than 59 or less than 0
      if (e.value > 59) {
        e.value = 59;
      } else if (e.value < 0) {
        e.value = 0;
      }
  }
  
  
} // calendarClass  client-side  -end class

export { calendarClass };
app.page = new calendarClass("weeks","app.page"); 
app.page.main();