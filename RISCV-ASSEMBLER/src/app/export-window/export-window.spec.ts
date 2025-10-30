import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExportWindow } from './export-window';

describe('ExportWindow', () => {
  let component: ExportWindow;
  let fixture: ComponentFixture<ExportWindow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportWindow]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExportWindow);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
