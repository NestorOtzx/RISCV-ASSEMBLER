import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OutputText } from './output-text';

describe('OutputText', () => {
  let component: OutputText;
  let fixture: ComponentFixture<OutputText>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OutputText]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OutputText);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
